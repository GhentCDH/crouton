# External-route operations — proxy a resource operation to an external service

Status: **planned, not implemented** · Author handoff for Bo · 2026-09-09

## Goal

Let a single operation in `resource.json` be served by an **external API** instead of a
crouton-registered endpoint. Declaring an operation as an object with a `route` means:

```jsonc
{
  "schemaVersion": 1,
  "operations": {
    "findAll": false,
    "findOne": false,
    "create": false,
    "update": false,
    "patch": false,
    "delete": { "route": "/annotation/{id}" }   // ← external; crouton registers nothing
  }
}
```

The `route` is taken over verbatim into the compiled operations map the frontend consumes.
Crouton does **no** internal work for that op — no controller method, no repository call, no
Prisma. The client calls the external service directly. Columns still describe *how the resource
is displayed*, so this doubles as "a config-only resource that proxies an external API and renders
its data".

## Why this is small (the key insight)

The frontend is already a thin client. The compiled contract for each op is `{ uri, method }`
(`buildResourceOperations` → `resource.api.ts`), and the client just does
`fetch[method](replaceUriParams(uri, params))`. Today that `uri` is always
`${baseUri}${OP_SUFFIX[op]}` (crouton's own route). The whole feature is:

1. let an op declare its own `route`,
2. put that `route` into the compiled `uri` instead of the crouton route, and
3. skip internal endpoint registration for that op.

No HTTP client, proxy, or new runtime is needed on the API side for the client-direct design.

## Orthogonality (fits the existing model)

`external route` is a **third, per-operation** axis, orthogonal to the two existing ones:

- `kind` (resource) = schema source — `prisma` (Zod model) vs `custom` (columns) — see
  [[custom-resource-kind]].
- `adapter` (datasource) = data-access mechanism — `prisma` vs `custom` — see
  [[datasource-adapter]] / [[custom-adapter]].
- **`operations.<op>.route`** (this plan) = *who serves this one op* — crouton vs an external URL.

A fully-external resource (every enabled op has a `route`) needs **no** `model`, `repository.ts`,
or custom adapter. It's naturally a `kind: "custom"` resource (columns give the display schema via
`buildViewsFromColumnTypes`) whose ops all point outward. Mixed is allowed: e.g. Prisma-backed
`findAll`/`findOne` for the list/detail views, external `delete` to a legacy service.

## Design

### 1. Schema — accept `{ route }` as an operation entry
`packages/crouton-core/src/lib/data-source/Operations.schema.ts`

Add an external variant to `OpEntry`:

```ts
const ExternalOpEntry = z.object({
  route: z.string(),                 // external URL/path; may contain {id}, {env.X} placeholders
  method: z.string().optional(),     // defaults to the op's natural method
  security: SecuritySchema.optional(),
});
const OpEntry = z.union([z.boolean(), ExternalOpEntry, z.object({ security: SecuritySchema.optional() })]);
```

Order the union so `{ route }` matches before the bare `{ security? }` object. (Sub-resource ops
in `buildSubResourceOperations` stay boolean-only for now — declare external sub-ops later if
needed.)

### 2. Definition — carry the route through
`packages/crouton-api/src/lib/crud/resource/defintion.schema.ts` +
`builder/schema.helpers.ts` (`opWithSchema` / `buildResourceDefinitions`).

Add `route?: string` and `method?: string` to `OperationDef`. In `opWithSchema`, when the JSON
entry is an external object, return `{ route, method }` (schema not needed — no crouton I/O).
The op stays "enabled" (`def[op] != null`) so it still appears in the compiled operations map.

Add helpers in `crud.config.ts` (and the crouton-core `crud-config` mirror used by compile):
```ts
export const isOperationExternal = (def, op) =>
  typeof def[op] === 'object' && 'route' in def[op];
export const externalRouteFor = (def, op) => (def[op] as any)?.route as string | undefined;
```

### 3. Skip internal registration for external ops
`register-findall.ts`, `register-findone.ts`, `register-create.ts`, `register-update.ts`,
`register-patch.ts`, `register-delete.ts`.

Each already early-returns on `!isOperationEnabled(...)`. Add: also early-return when
`isOperationExternal(ctx.definition, op)`. Result: no NestJS route, no repository binding for that
op. (Because it's skipped, a fully-external resource never touches the repository/adapter — so it
needs no `model` startup check either; make sure the `prisma[model]` / repository validation only
runs for ops that are *internally* served.)

### 4. Emit the external URL into the compiled operations map
`packages/crouton-core/src/lib/compile/payload-builders.ts` → `buildResourceOperations`.

```ts
RESOURCE_OPS.filter(op => isOperationEnabled(definition, op)).map(op => {
  const ext = externalRouteFor(definition, op);
  const uri = ext
    ? resolveEnvPlaceholders(ext)                       // {env.X} resolved at compile
    : `${baseUri}${OP_SUFFIX[op]}`;                      // crouton route (today)
  const method = (isOperationExternal(definition, op) && definition[op].method) || OP_METHOD[op];
  return [op, { uri, method }];
});
```

`{id}` and other `{...}` placeholders are left intact for the client's `replaceUriParams`.
Reuse the existing `resolveEnvPlaceholders` so a route can be `{env.ANNOTATION_API}/annotation/{id}`.

Also audit the two sibling emitters:
- `buildResourceJsonPayload` — emits booleans + `lookup`; fine, but `lookup` should be suppressed
  (or pointed externally) when `findAll` is external.
- `buildDefinitionPayload` — emits only the op-name array; no change, but confirm external ops
  should still be listed (yes — the client needs to know the op exists).

### 5. Frontend — verify, likely no change
`resource.api.ts` / `form-def.schema.ts` already accept `{ uri, method }` and call it. Confirm:
- `replaceUriParams` handles `{id}` in an absolute URL (it should — plain string replace).
- `useApi()`'s axios instance and its baseURL/interceptors behave for an external `uri`
  (see the auth caveat below).

## Open questions / decisions for Bo

1. **Relative vs absolute routes & auth leakage.** A relative `/annotation/{id}` resolves against
   the axios `baseURL` (crouton's own API/proxy). An absolute `https://legacy/annotation/{id}`
   goes straight to the third party — and `useApi()`'s interceptor may attach the user's bearer
   token to that foreign origin. Options: (a) allow only relative routes (recommended first cut —
   the external service sits behind crouton's origin / a reverse proxy); (b) allow absolute but
   strip auth headers for non-same-origin uris; (c) per-op `auth: false`. Recommend (a) now.

2. **Response-shape contract for read ops.** `delete` (Bo's example) is trivial — no response
   shape. But `findAll` expects the `{ data, request: { count, page, ... } }` envelope and
   `findOne` a row matching the columns. An arbitrary external API won't. So either:
   - restrict external ops to write/delete for the first cut (recommended), **or**
   - document that an external `findAll`/`findOne` service must return crouton's envelope/row
     shape, **or**
   - add an optional client-side `map` per op later. Decide the initial scope.

3. **Client-direct vs server-side proxy.** This plan is client-direct ("nothing internally in
   crouton"), matching your note. If CORS/auth get painful, the fallback is a thin server proxy:
   crouton registers the route and forwards to `route` server-side (one `fetch` in the API). Keep
   the same `{ route }` schema so switching is a loader flag, not a config change. Decide now
   whether to reserve `proxy: true` on the op for that.

4. **`method` override needed?** Only if an external op uses a non-standard verb. Cheap to keep.

## Traps (from prior crouton work)

- **Schema drift check in CI.** Changing `Operations.schema.ts` regenerates
  `resource.schema*.json` via `crouton-core/scripts/gen-resource-schema.mjs`. Run it and commit the
  diff or `merge-request.yml`'s `git diff` gate fails. (Same gate bit the kind/adapter work.)
- **Two `crud-config` copies.** `isOperationEnabled` lives in both `crouton-api/.../crud.config.ts`
  and a `crouton-core/.../compile/crud-config` mirror. Add `isOperationExternal`/`externalRouteFor`
  to **both**, or compile and API disagree.
- **`z.infer` erases generics** — hand-write any new interface fields rather than inferring
  (recurring `ctx.prisma: any` trap).
- **Don't guess the union order.** `{ route }` must be matched before the bare `{ security? }`
  object in `OpEntry`, or a routed op parses as an empty security object.
- **Typecheck/lint already red on main** — compare error *sets* before/after; CI runs build/test/
  lint only.

## Phasing

- **A. Schema + definition** — `Operations.schema.ts`, `defintion.schema.ts`, `schema.helpers.ts`,
  `isOperationExternal`/`externalRouteFor` in both crud-config copies. Regenerate resource schema.
- **B. Skip registration** — early-return in the six `register-*.ts`; ensure fully-external
  resources skip the model/repository startup validation.
- **C. Compile payload** — external `uri`/`method` in `buildResourceOperations`; handle `lookup`;
  reuse `resolveEnvPlaceholders`.
- **D. Scope guard + tests** — restrict to write/delete (or document the read contract); unit tests
  for schema parse, definition build, registration skip, and compiled-uri output; one end-to-end
  fixture resource with an external `delete`.
- **E. Docs** — "external operations" section: relative-route recommendation, response contract,
  security caveat.
