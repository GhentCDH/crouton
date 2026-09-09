# External operations

An operation can be served by an **external API** instead of a crouton-registered endpoint.
Declare it as an object with a `route` key:

```json
{
  "operations": {
    "findAll": true,
    "findOne": true,
    "create": false,
    "update": false,
    "patch":  false,
    "delete": { "route": "/annotation/{id}" }
  }
}
```

Crouton registers **no** NestJS route, no repository call, and no Prisma query for that operation.
The compiled operations map the frontend consumes gets the external route as the `uri` — the client
calls the external service directly.

## How it works

The frontend's operations map is a set of `{ uri, method }` entries per operation. Normally crouton
fills in its own route (`${baseUri}/{id}` for delete, etc.). With an external op, the `route` you
declare becomes the `uri`, and the client calls it the same way it calls any other operation.

`{id}` and other `{param}` placeholders work exactly as they do with crouton routes — the client
replaces them at call time.

## Environment-variable placeholders

Use `{env.VAR_NAME}` in the route to reference an environment variable that is resolved **at compile
time** (when crouton builds the operations payload):

```json
{
  "delete": { "route": "{env.LEGACY_API}/annotation/{id}" }
}
```

If `LEGACY_API=https://legacy.example.com`, the compiled uri becomes
`https://legacy.example.com/annotation/{id}`. If the variable is unset, the placeholder is left
intact.

## Method override

The default HTTP method for each operation (`get`, `post`, `put`, `patch`, `delete`) is kept unless
you override it:

```json
{
  "delete": { "route": "/annotation/{id}", "method": "post" }
}
```

## Relative vs absolute routes

**Relative routes are recommended for the first cut.** A path like `/annotation/{id}` resolves
against the axios `baseURL` (crouton's own API). Behind a reverse proxy this is the simplest setup
and avoids cross-origin auth issues.

Absolute routes (`https://legacy.example.com/...`) work, but your frontend's axios interceptor will
attach the user's bearer token to that foreign origin. If the external service should not receive
it, configure axios to strip auth headers for non-same-origin requests, or use a server-side proxy
in front of the external service.

## Fully-external resources

A resource where every enabled operation has a `route` needs **no** `model`, `repository.ts`, or
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
    "create":  { "route": "/annotation" },
    "update":  { "route": "/annotation/{id}" },
    "delete":  { "route": "/annotation/{id}" }
  },
  "columns": {
    "id": { "idField": true },
    "text": { "type": "string" }
  }
}
```

## Read operations and response shape

`delete`, `create`, `update`, and `patch` are the safe choices for external ops — they have no
response-shape contract with the crouton frontend.

`findAll` and `findOne` are supported but the external service **must** return crouton's envelope:

- `findAll` → `{ data: [...], request: { count, page, pageSize, totalPages, ... } }`
- `findOne` → a row object matching the resource's columns

An arbitrary external API will not return this shape without an adapter layer. Restrict external ops
to write operations for an initial integration, and add `findAll`/`findOne` only if you control the
external service or add a translation layer.

When `findAll` is external, the `lookup` query endpoint (`?q=`) is also suppressed — crouton does
not know how to proxy a text search to an arbitrary external service.
