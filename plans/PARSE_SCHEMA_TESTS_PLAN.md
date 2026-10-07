# parseSchema Tests Plan — fixture-driven tests for core and api

## Goal

The schema compile path — `resource.json` (+ optional zod `schema`) → the schema
payload the frontend consumes — is the heart of crouton. It is reached two ways:

1. **Core (pure):** `parseSchema` from `@ghentcdh/crouton-core`
   (`packages/crouton-core/src/lib/compile/parse-schema.ts`) — no fs, no Nest.
   Has **no tests in crouton-core** today.
2. **API (served):** `GET /<route>/schemas` (+ `/definition`, `/resource.json`) and
   `GET /<parent>/<child>/schemas` for sub-resources, produced by the loader
   (`loadResourceConfigsFromDir`) → `fromJson` → `createCrudController` →
   `registerSchemas`. Today only covered indirectly (one parity spec,
   `crouton-api/src/lib/crud/parse-schema.spec.ts`, and a few `getSchemas` checks).

We want **one shared set of `resource.json` fixtures** run through **both paths**:
core with snapshots of every view, api through the actual `/schemas` endpoints —
plus api-only cases for sub-resources (which need sibling files and are skipped
in the pure core path by design).

## Shared fixtures

Each case is a small *resources directory* — the same shape the api loader reads —
so core and api consume the exact same files:

```
packages/crouton-core/test-fixtures/resources/
  <case>/
    crouton.enums.json           # optional, case-level enum registry
    <resource>/resource.json
    <resource>/schema.ts         # optional, default export z.object(...)
    <parent>/<child>/resource.json   # sub-resource cases (api only)
  load.ts                        # core helper (import.meta.glob, browser-safe)
```

- Lives outside `src/` so it is not bundled/published; add to `files` exclusion if needed.
- Core loads via `import.meta.glob(..., { eager: true })` — no `fs`, package boundary respected.
- Api points `loadResourceConfigsFromDir` at the case folder (Node, fs is fine there).
- Each case sets `meta.json` (optional) with `{ "coreOnly": true }` / `{ "apiOnly": true }`
  so one loop per suite can skip cases that do not apply.
- **Gotcha:** `loadEnumRegistry` walks *up* the tree looking for `crouton.enums.json`.
  Api tests must pass `enumsFile` explicitly (or a non-existent path) so a case without
  enums does not pick up another case's / the repo's file.

### Fixture matrix

| # | Case | What it exercises | Core | API |
|---|------|-------------------|:---:|:---:|
| 1 | `minimal-prisma` | `model` only, `kind` auto-derived to `prisma`, defaults (sidebar, operations) | ✓ | ✓ |
| 2 | `minimal-custom` | `kind: "custom"` (+ `repository.ts` for api), no schema | ✓ | ✓ |
| 3 | `column-flags` | `idField`, `searchable`, `sortable`, `filterable`, `defaultSort`, `hiddenInForm`, `hiddenInTable`, `required:false` | ✓ | ✓ |
| 4 | `column-types` | string / integer / number / boolean / date / textarea fieldInput | ✓ | ✓ |
| 5 | `enum-column` | `enum: "bookStatus"` + `crouton.enums.json`; missing enum entry | ✓ | ✓ |
| 6 | `relation-many-to-one` | autocomplete `manyToOne` (from `loan`) → relation format default, valueLabelColumns | ✓ | ✓ |
| 7 | `relation-many-to-many` | `format: relation` + `manyToMany` (from `book.categories`) | ✓ | ✓ |
| 8 | `include` | plain + nested include entries, sort enrichment | ✓ | ✓ |
| 9 | `calculated-columns` | injected into table + view | ✓ | ✓ |
| 10 | `actions` | resource `actions` + `tableActions` | ✓ | ✓ |
| 11 | `operations-subset` | only `findAll`/`findOne` → definition & ops limited | ✓ | ✓ |
| 12 | `external-operations` | per-op `uri` / `method` / `{env.X}` | ✓ | ✓ |
| 13 | `layout` | explicit `layout` for form/view/table | ✓ | ✓ |
| 14 | `lookup` | `showInLookup` / `idField` ≠ `id` → `lookup` + `idField` | ✓ | ✓ |
| 15 | `custom-parent` | `kind: custom` + `parent` mount | ✓ | ✓ |
| 16 | `extensions` | top-level `annotation` section with registered extension | ✓ | ✓ |
| 17 | `book-collection` | copy of the 5 example resources (author, book, category, loan, user) | ✓ | ✓ |
| 18 | `sub-prisma-in-prisma` | parent relation column → `./child` (oneToMany table) | – | ✓ |
| 19 | `sub-custom-in-prisma` | `groups/expense` custom child with `repository.ts` (see `custom-sub-resource.spec.ts`) | – | ✓ |
| 20 | `sub-custom-in-custom` | nested custom resources (see `nested-resource.spec.ts`) | – | ✓ |
| 21 | `sub-unresolved` | relation points to a missing `./x.resource` | – | ✓ |
| 22 | `sub-hidden` | sub-resource `hiddenInForm` + `hiddenInView`, no `views` | – | ✓ |

Start with 1–8 + 17 + 18–19; add the rest incrementally.

---

## Part 1 — Core (`@ghentcdh/crouton-core`)

### Files

```
packages/crouton-core/src/lib/compile/
  parse-schema.spec.ts            # behaviour tests (input, errors, config)
  parse-schema.fixtures.spec.ts   # loop over fixtures × 3 views → file snapshots
  __snapshots__/parse-schema/<case>.<resource>.<view>.json
```

Snapshots via `toMatchFileSnapshot(...)` → readable JSON diffs in review.

### Behaviour tests

**Input normalization**
- raw json and `{ json }` give identical output
- `{ json, schema }` uses schema for types/required (compare with/without schema)

**Views**
- default view is `schemas`
- `schemas` returns `undefined` when the resource has no views (pin down which input causes this)
- `definition` contains one JSON Schema per enabled operation
- `resource.json` view uses `baseUrl` in uris

**Validation errors** (`toThrow(/Resource cannot be parsed/)`)
- `kind: custom` + `calculatedColumns`
- `kind: custom` + `parent.param: "id"`
- `parent` on a prisma resource
- unknown top-level key without a registered extension
- wrong column shape (invalid `type`, etc.)

**appConfig**
- `baseUrl` absent vs present → relative vs absolute uris
- `schemaEnricher` merged on top (and can override keys); not called when payload is `undefined`
- `extensions` registered *before* validation (extension key accepted and passed through)
- registry isolation: `afterEach(clearResourceExtensions)` — the registry is global

**Purity**
- same input twice → equal output; input not mutated (`structuredClone` before, `toEqual` after)

---

## Part 2 — API (`@ghentcdh/crouton-api`) through real HTTP `/schemas`

Same fixtures, different approach: boot a real Nest app with the case folder and
call the endpoints over HTTP. This covers what core cannot: fs loading,
migrations, `schema.ts` / `repository.ts` discovery, enum file lookup, sibling
resource resolution, sub-resources, route registration + prefix, guards /
security, interceptors, language negotiation and `schemaEnricher` on the endpoint.

### New devDependencies (crouton-api)

| Package | Why |
|---|---|
| `@nestjs/testing` | `Test.createTestingModule({ imports: [module] })` |
| `@nestjs/platform-express` | HTTP adapter for `app.init()` |
| `supertest` + `@types/supertest` | `request(app.getHttpServer()).get(...)` |
| `unplugin-swc` + `@swc/core` | vitest's esbuild emits **no decorator metadata**; the generated controller injects `DataSourceRegistry` / `ResourceConfigRegistry` by constructor *type* (no `@Inject`), so Nest DI fails without swc |

`vitest.config.ts`:

```ts
import swc from 'unplugin-swc';
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: { globals: true, include: ['src/**/*.spec.ts'] },
});
```

Check the existing specs still pass with swc enabled (step 5).

### Booting a case

`test-utils.ts`:

```ts
export const bootCase = async (caseName: string, appConfig: Partial<CroutonAppConfig> = {}) => {
  const dir = copyCaseToTmp(caseName);               // loader may migrate/rewrite files
  const configs = await loadResourceConfigsFromDir(dir, BASE_URL, enumsFileFor(dir));
  const loader = new FileSystemResourceConfigLoader(dir, BASE_URL, enumsFileFor(dir));
  const module = await CroutonApiModule.forLoader(loader, configs, stubDataSources(configs), {
    baseUrl: BASE_URL, prefix: 'api', ...appConfig,
  });
  const ref = await Test.createTestingModule({ imports: [module] }).compile();
  const app = ref.createNestApplication();
  await app.init();
  return { app, http: request(app.getHttpServer()), dir };
};
```

Things the helper must handle:

- **`loadConfig()`** looks for a crouton config from `process.cwd()` and throws if none →
  `vi.mock('../config/read', ...)` returning `{ enumsFile: <case>/crouton.enums.json }`
  (or put a minimal `crouton.config.*` in each case and `process.chdir`).
- **Enums:** the module loads its own enum registry from `config.enumsFile` — so the
  mock above must point at the case file; without it the walk-up lookup can find the
  wrong file.
- **Prisma resources need a datasource:** the module validates the `model` exists on the
  client. `stubDataSources(configs)` returns one prisma adapter entry whose `client`
  has a delegate per model (`{ book: { findMany, count, findUnique, ... } }` as `vi.fn()`).
  Schema endpoints never hit the db, but a stub keeps the resource from being skipped.
- **Copy to tmp** (`mkdtempSync`) — dev-mode migration rewrites `resource.json` on disk.
- `afterEach`: `app.close()`, `clearResourceExtensions()`, `resourceLoadErrorsRegistry.clear()`,
  restore env, `rmSync(dir)`.

### Files

```
packages/crouton-api/src/lib/crud/schemas/
  test-utils.ts                         # bootCase, stubDataSources, config mock
  schemas-endpoint.fixtures.spec.ts     # shared fixtures × endpoints
  schemas-endpoint.spec.ts              # behaviour: enricher, security, i18n, dev, load errors
  sub-resource-schemas.spec.ts          # sub-resource cases 18–22
  __snapshots__/schemas/<case>.<resource>.<endpoint>.json
```

### Fixture loop (cases 1–17)

Boot each case once (`beforeAll`), then for every resource:

- `GET /api/<route>/schemas` → 200, body **equals**
  `parseSchema({ json, schema, enums }, { baseUrl }, 'schemas')` for resources without
  sibling-file features → proves core and api agree
- where the api adds more (sibling `extend`, `resource` refs → `schemasUri`): assert
  the difference, snapshot the full body
- same for `GET /api/<route>/definition` vs `'definition'` and
  `GET /api/<route>/resource.json` vs `'resource.json'`
- every `operations.*.uri` / `schemasUri` in the body is a real route: call it and
  expect ≠ 404 (catches drift between generated uris and registered routes)

### Behaviour tests (`schemas-endpoint.spec.ts`)

- `prefix` → endpoints under `/api/...`; without prefix at root
- `schemaEnricher` applied on `/schemas`, `/definition`, `/resource.json`;
  resource without views → empty body (pin 200 vs 204)
- unknown route → 404
- `security` on resource / module default → request without credentials gets 401/403
  on `/schemas` (register a test guard via `appConfig.security.guards`)
- language: `Accept-Language: nl` → localized payload; unknown language → default
- dev mode (`CROUTON_SCHEMA_EDITOR=true`): edit `resource.json` in the tmp dir between
  two requests → second response reflects the change (`IS_DEV` read at import → set env +
  `vi.resetModules()` before importing the module)
- invalid `resource.json` → resource not served (404), entry in `resourceLoadErrorsRegistry`
  and visible on `GET /api/crouton/status`
- outdated schema version → migrated (dev) / load error (non-dev)
- `draft: true` → 404

### Sub-resource tests (`sub-resource-schemas.spec.ts`)

For each sub case (18–22), over HTTP:

**Routing**
- `GET /api/<parent>/<child>/schemas` → 200
- case 22 (no `views`) → 404

**Child payload** (`buildSubResourceViewsPayload`)
- `id` = `<route>/<childRoute>`, `route`, `name`, `title` defaults to `childRoute`
- `uri` = `${baseUrl}/<route>/{parent.id}/<childRoute>`
- `idField` / `idType` defaults (`id` / `string`) and overrides
- `operations` from child operations with `{parent.id}` uris — and those routes exist
  (`GET /api/<parent>/<pid>/<child>` ≠ 404, data from the stub / `repository.ts`)
- `schemas.<view>` has `data`, `ui`, `defaultSort`
- `actions` resolved against child base
- `modalSize` / `display` only when set

**Parent payload**
- `GET /api/<parent>/schemas`: relation column carries `schemasUri` / `resource` =
  `${baseUrl}/<route>/<childRoute>/schemas` (from `column-enrichment.ts`) and that URL
  answers 200
- `includeInFindOne` / `findOneOrderBy` from `hiddenInForm/hiddenInView` and `options.sort`

**Kinds**
- prisma child in prisma parent (18), custom child in prisma parent (19), custom in custom (20)
- unresolved child (21) → parent still 200, error recorded, child endpoint 404

**i18n / dev**
- `Accept-Language` → child payload rebuilt from localized parent; missing → cached payload
- the existing controller-level specs (`custom-sub-resource.spec.ts`, `nested-resource.spec.ts`)
  stay; HTTP tests sit on top, not instead

---

## Steps

1. Create `packages/crouton-core/test-fixtures/resources/` with cases 1–8, 17 (+ `schema.ts`, enums).
2. Core: `parse-schema.spec.ts` (behaviour/errors/config/purity).
3. Core: `parse-schema.fixtures.spec.ts`; review first snapshots by hand — they become the contract.
4. `pnpm nx test crouton-core` (+ `--coverage` on `compile/`; add fixtures for uncovered branches).
5. Api: add devDeps (`@nestjs/testing`, `@nestjs/platform-express`, `supertest`, `@types/supertest`,
   `unplugin-swc`, `@swc/core`), enable swc in `vitest.config.ts`, confirm existing api specs stay green.
6. Api: `test-utils.ts` (`bootCase`, config mock, stub datasources) + one smoke test
   (`GET /api/<route>/schemas` on `minimal-prisma`).
7. Api: `schemas-endpoint.fixtures.spec.ts` on cases 1–8, 17.
8. Api: sub-resource cases 18–19 + `sub-resource-schemas.spec.ts`.
9. Api: `schemas-endpoint.spec.ts` (prefix, enricher, security, i18n, dev, load errors).
10. `pnpm nx test crouton-api`.
11. Slim `crouton-api/.../parse-schema.spec.ts` down to parity only (now covered by step 7).
12. Remaining fixtures 9–16, 20–22.

## Open questions

- Snapshots vs targeted assertions? Proposal: both.
- Book-collection fixtures as copies, or point at `examples/` directly? Proposal: copies (stable).
- Fixture location: `crouton-core/test-fixtures` (api reads it via relative path) vs a
  root-level `tools/test-fixtures`. Proposal: core, as it owns the format.
- `loadConfig()`: mock it, or ship a `crouton.config.*` per case and `chdir`? Proposal: mock
  (`chdir` is process-global and breaks parallel test files).
- One Nest app per case (`beforeAll`) vs per test: per case, unless a test mutates files/env.
