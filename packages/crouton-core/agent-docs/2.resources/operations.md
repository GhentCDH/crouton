# Operations

All CRUD operations default to **enabled** — omitting the `operations` object, or a specific key, still exposes that
endpoint. Set a key to `false` to disable it.

| Operation | HTTP Method | Route  | Description                                          |
|-----------|-------------|--------|------------------------------------------------------|
| `findAll` | `GET`       | `/`    | List all records (paginated)                         |
| `findOne` | `GET`       | `/:id` | Get one record by id                                 |
| `create`  | `POST`      | `/`    | Create a new record                                  |
| `update`  | `PUT`       | `/:id` | Full replace — all fields required per schema        |
| `patch`   | `PATCH`     | `/:id` | Partial update — fields optional (auto `.partial()`) |
| `delete`  | `DELETE`    | `/:id` | Delete a record                                      |

Each key accepts three forms:

| Value | Meaning |
|-------|---------|
| `true` (default) | Crouton registers and serves the endpoint |
| `false` | Endpoint disabled — not registered |
| `{ "uri": "/path/{id}" }` | **External** — client calls the given route directly; crouton registers nothing |

## PUT vs PATCH

Both `update` and `patch` default to `true`. They share the same Prisma `update()` call — the difference is in
validation:

- **`update` (PUT)** uses the full update schema. All required fields must be present.
- **`patch` (PATCH)** uses `updateSchema.partial()` by default (all fields optional).

In the frontend, **manual save** sends a `PUT` (full replace) and **autosave** sends a `PATCH` (partial update).

Hooks receive `op: 'update'` for PUT calls and `op: 'patch'` for PATCH calls, so `beforeWrite`/`afterWrite` hooks can
distinguish between the two.

## Per-operation security

Override the module-level security guard for a specific operation:

```json
{
  "operations": {
    "findAll": true,
    "delete": { "security": "admin" }
  }
}
```

The `"admin"` key refers to a named guard registered in `CroutonApiModule`. See [Security](security.md) for the full
guard configuration.

## External operations

Declare an operation as `{ "uri": "..." }` to have the frontend call an external service directly for that
operation, with crouton registering nothing internally:

```json
{
  "operations": {
    "findAll": true,
    "findOne": true,
    "create":  false,
    "update":  false,
    "patch":   false,
    "delete":  { "uri": "/annotation/{id}" }
  }
}
```

Crouton registers **no** NestJS route, no repository call, and no Prisma query for that operation.
The compiled operations map the frontend consumes gets the external route as the `uri` — the client
calls the external service directly.

### How it works

The frontend's operations map is a set of `{ uri, method }` entries per operation. Normally crouton
fills in its own route (`${baseUri}/{id}` for delete, etc.). With an external op, the `uri` you
declare is used directly, and the client calls it the same way it calls any other operation.

`{id}` and other `{param}` placeholders work exactly as they do with crouton routes — the client
replaces them at call time.

### Environment-variable placeholders

Use `{env.VAR_NAME}` in the route to reference an environment variable resolved **at compile time**:

```json
{
  "delete": { "uri": "{env.LEGACY_API}/annotation/{id}" }
}
```

If `LEGACY_API=https://legacy.example.com`, the compiled uri becomes
`https://legacy.example.com/annotation/{id}`. If the variable is unset, the placeholder is left intact.

### Method override

The default HTTP method for each operation (`get`, `post`, `put`, `patch`, `delete`) is kept unless you override it:

```json
{
  "delete": { "uri": "/annotation/{id}", "method": "post" }
}
```

### Relative vs absolute routes

**Relative routes are recommended for the first cut.** A path like `/annotation/{id}` resolves
against the axios `baseURL` (crouton's own API). Behind a reverse proxy this is the simplest setup
and avoids cross-origin auth issues.

Absolute routes (`https://legacy.example.com/...`) work, but your frontend's axios interceptor will
attach the user's bearer token to that foreign origin. If the external service should not receive
it, configure axios to strip auth headers for non-same-origin requests, or use a server-side proxy
in front of the external service.

### Fully-external resources

A resource where every enabled operation has a `uri` needs **no** `model`, `repository.ts`, or
custom adapter. It is naturally a `kind: "custom"` resource — `columns` still describe how the data
is displayed, and crouton never touches the data itself.

```json
{
  "name": "legacy-annotation",
  "route": "legacy-annotation",
  "kind": "custom",
  "operations": {
    "findAll": false,
    "findOne": false,
    "create":  { "uri": "/annotation" },
    "update":  { "uri": "/annotation/{id}" },
    "delete":  { "uri": "/annotation/{id}" }
  },
  "columns": {
    "id": { "idField": true },
    "text": { "type": "string" }
  }
}
```

### Read operations and response shape

`delete`, `create`, `update`, and `patch` are the safe choices for external ops — they have no
response-shape contract with the crouton frontend.

`findAll` and `findOne` are supported but the external service **must** return crouton's envelope:

- `findAll` → `{ data: [...], request: { count, page, pageSize, totalPages, ... } }`
- `findOne` → a row object matching the resource's columns

Restrict external ops to write operations for an initial integration, and add `findAll`/`findOne` only if you control
the external service or add a translation layer.

When `findAll` is external, the `lookup` query endpoint (`?q=`) is also suppressed — crouton does
not know how to proxy a text search to an arbitrary external service.
