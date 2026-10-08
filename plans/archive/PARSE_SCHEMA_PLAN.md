Status: implemented
# ParseSchema Plan — compile one resource to a schema payload without a Nest module

## Goal

Today the only way to get the compiled schema JSON (the thing the frontend
consumes) is to boot `CroutonApiModule.forResourceDir(...)` and hit a controller
endpoint (`GET /schemas`, `/definition`, `/resource.json`). We want a pure
function:

```ts
parseSchema(someResource, { baseUrl, prefix, extensions, schemaEnricher }, 'schemas')
// → a plain object you can JSON.stringify to disk, or ship to the frontend
```

so a single resource can be compiled offline (build step, CLI, test, or to
pre-bake a static `schema.json`).

## What actually produces the payload today

`forResourceDir` → `loadResourceConfigsFromDir` → for each dir:
`readResourceJson` (validate) → `fromJson(json, schema, hooks, dir, baseUrl,
actions, tableActions, enums, repository)` → a `Resource`. The controllers then
serve that `Resource` through three builders in
`crud/operations/payload-builders.ts`:

- `buildViewsPayload(config, baseUrl)` → `GET /schemas` (table/form `json_schema`
  + `ui_schema`, operations, actions) — **this is the frontend-facing one**
- `buildDefinitionPayload(config)` → `GET /definition` (per-op Zod→JSON Schema)
- `buildResourceJsonPayload(config, baseUrl)` → `GET /resource.json` (compact)

Each endpoint finishes with `schemaEnricher` applied identically:
`return { ...payload, ...schemaEnricher(payload) }`.

**So `parseSchema` = (register extensions) → `fromJson` → pick a builder →
apply `schemaEnricher`.** All four pieces already exist; this is composition, not
new logic.

## Ordering contract (do not break)

`forResourceDir` registers extensions *before* parsing, because
`buildResourceJsonSchema()` and every `pickExtensions()` read the global
`getResourceExtensions()` registry (`crouton-core/.../extensions.ts`). `parseSchema`
must do the same **first thing**, before it validates `json` or calls `fromJson`.

## Proposed API

New file: `packages/crouton-api/src/lib/crud/parse-schema.ts`

```ts
export type ParseSchemaView = 'schemas' | 'definition' | 'resource.json';

export interface ParseSchemaInput {
  /** Raw resource.json (validated internally) or an already-parsed ResourceJson. */
  json: unknown;
  /** Sibling schema.ts default export. Required for prisma resources; omit for kind:"custom". */
  schema?: ZodObject<ZodRawShape>;
  /** Enables sibling-resource features (extend columns, resource-ref options, sub-resources). */
  dirPath?: string;
  enums?: EnumRegistry;
  hooks?: ResourceHooks;
  actions?: ResourceRowAction[];
  tableActions?: ResourceTableAction[];
}

type ParseAppConfig = Pick<
  CroutonAppConfig,
  'baseUrl' | 'prefix' | 'extensions' | 'schemaEnricher'
>;

export const parseSchema = (
  input: ParseSchemaInput | unknown,        // bare json also accepted
  appConfig: ParseAppConfig,
  view: ParseSchemaView = 'schemas',
): Record<string, unknown> | undefined => { /* ... */ };
```

`CroutonAppConfig` is currently a private type inside `crouton-api.module.ts` —
export it (or lift it to its own `app-config.ts`) so `parseSchema` and callers
share one definition.

## Implementation steps

1. **Lift/export `CroutonAppConfig`** from `crouton-api.module.ts` into a small
   `crud/app-config.ts` and re-export. Both the module and `parseSchema` import it.

2. **Extract the register→parse→build sequence into `parseSchema`:**
   1. `if (appConfig.extensions) registerResourceExtensions(appConfig.extensions)`.
   2. Normalize input to `{ json, schema, ... }` (accept a bare object as `json`).
   3. If `json` isn't already validated, run
      `buildResourceJsonSchema().safeParse(json)`; throw a clear error on failure
      (reuse the message style from `readResourceJson`).
   4. `const resource = fromJson(json, input.schema, input.hooks, input.dirPath,
      appConfig.baseUrl, input.actions, input.tableActions, input.enums ?? {},
      /* repository */ undefined)`.
   5. Pick builder by `view`:
      `schemas` → `buildViewsPayload(resource, appConfig.baseUrl)`;
      `definition` → `buildDefinitionPayload(resource)`;
      `resource.json` → `buildResourceJsonPayload(resource, appConfig.baseUrl)`.
   6. `if (payload && appConfig.schemaEnricher) payload = { ...payload,
      ...appConfig.schemaEnricher(payload) }`.
   7. Return `payload`.

3. **Export** `parseSchema` and its types from `packages/crouton-api/src/index.ts`.

4. **(Optional) De-dupe with the loader/endpoints.** The register→`fromJson`
   sequence now lives in two places. If worth it, have `loadResourceConfigsFromDir`
   and `parseSchema` share one `compileResourceJson(json, deps, appConfig)` helper
   so the two paths can't drift. Not required for a first cut.

## Behaviour notes / limits (document in JSDoc)

- **`prefix` does not affect the payload.** It only prefixes controller routes.
  `buildViewsPayload`/`buildResourceJsonPayload` use `baseUrl` for URIs. Accept
  `prefix` for signature parity with `forResourceDir` but note it is ignored here
  (or drop it from `ParseAppConfig`).
- **`view: 'schemas'` returns `undefined` when the resource declares no `views`**
  (same as `buildViewsPayload` today). Callers should handle that.
- **Without `dirPath`**, features that read sibling files are skipped: `extend`
  columns, resource-ref column options, and sub-resource views. Pass `dirPath`
  to get parity with the on-disk loader. This also means `parseSchema` is
  Node/build-time (matches `fromJson`), while its *output* is the browser-safe
  JSON.
- **Custom resources** (`kind: "custom"`): pass no `schema`; views come from
  `buildViewsFromColumnTypes`. `repository` is irrelevant to the schema payload,
  so it stays `undefined`.
- **Enums**: pass `enums` to get enum values injected into columns; otherwise
  enum-referencing columns render without their value lists.

## Tests

`parse-schema.spec.ts` covering:
- prisma resource + Zod schema → `parseSchema(..., 'schemas')` equals the
  `buildViewsPayload` output the `/schemas` endpoint returns for the same config.
- `kind: "custom"` resource (no schema) → non-empty `schemas`.
- `extensions` + `schemaEnricher` both reflected in the output.
- `'definition'` and `'resource.json'` view variants.
- resource with no views → `undefined` for `'schemas'`.

## Files touched

- add `packages/crouton-api/src/lib/crud/parse-schema.ts`
- add `packages/crouton-api/src/lib/crud/app-config.ts` (lift `CroutonAppConfig`)
- edit `packages/crouton-api/src/lib/crouton-api.module.ts` (import lifted type)
- edit `packages/crouton-api/src/index.ts` (export `parseSchema` + types)
- add `packages/crouton-api/src/lib/crud/parse-schema.spec.ts`
