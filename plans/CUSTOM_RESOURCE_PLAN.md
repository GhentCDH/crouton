# Plan — Config-only resources (`kind: "custom"`) with a user-implemented `repository.ts`

## Goal

A second flavour of resource file that configures **only** the UI/API surface (form, table, view, filter, routes,
actions) and leaves the data access to the developer. No Prisma model, no `schema.ts`. The JSON model is assembled
**from the column configuration** instead of from a Zod/Prisma schema.

Decisions taken up front:

| Decision                    | Choice                                                                                                        |
|-----------------------------|---------------------------------------------------------------------------------------------------------------|
| Where the logic lives       | one **`repository.ts`** per resource, default-exporting an object, discovered by convention (like `hooks.ts`) |
| How the flavour is declared | new `"kind": "custom"` field in `resource.json` (default `"prisma"`)                                          |
| Scope                       | **full CRUD** — findAll, findOne, create, update, patch, delete                                               |
| Column typing               | **full inline JSON Schema** per column (`"type"` accepts a shorthand string *or* a schema fragment)           |

Controllers, routes, endpoints, `/schemas`, `/definition`, actions, hooks, sidebar and the whole frontend keep working
exactly as today — the wire contract is identical, so **no frontend change is required for the resource to function**.
The only frontend work in this plan is rendering nested object columns, which is a pre-existing gap.

---

## 1. Target file layout

```
resources/zotero_item/
  resource.json      # kind: "custom" — configures form/table/view/filter
  repository.ts      # ← user code: findAll / findOne / create / update / patch / delete
  hooks.ts           # optional, still applies (wraps the custom repository)
  actions/*.ts       # optional, unchanged
  (no schema.ts)
```

### `resource.json`

```jsonc
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "kind": "custom",                  // ← new. absent/"prisma" = today's behaviour

  "name": "zotero_item",
  "route": "zotero-items",
  "tag": "Zotero",
  "title": "Zotero items",
  // "model" is NOT allowed when kind === "custom" (there is no Prisma delegate).
  // "database" IS allowed and optional — it selects which datasource client is
  // handed to the repository as ctx.prisma. Omitted => the default datasource.
  "database": "maindb",

  "idField": "id",                   // still resolvable from columns[].idField
  "idType": "string",                // ← must actually be honoured (see §7, bug 5)

  "operations": {                    // unchanged semantics: enable/disable the endpoint
    "findAll": true, "findOne": true,
    "create": true, "update": true, "patch": true,
    "delete": false
  },

  "columns": {
    "id":    { "type": "string", "idField": true, "hiddenInForm": true, "hiddenInTable": true },
    "title": { "type": "string", "searchable": true, "sortable": true, "defaultSort": true },
    "year":  { "type": "integer", "filterable": true },
    "public": { "type": "boolean" },

    // full inline JSON Schema fragment
    "type": {
      "type": {
        "type": "object",
        "properties": {
          "id":   { "type": "string" },
          "name": { "type": "string" }
        }
      },
      "displayKey": "name",
      "fieldInput": { "type": "autocomplete", "options": { "uri": "/api/zotero/types?q={q}" } }
    },

    "tags": {
      "type": { "type": "array", "items": { "type": "string" } },
      "hiddenInTable": true
    },

    // relations to other resources keep working via fieldInput.resource
    "author": {
      "type": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" } } },
      "displayKey": "name",
      "fieldInput": { "format": "relation", "relationType": "manyToOne", "resource": "../author/resource.json" }
    }
  }
}
```

`type` accepts either:

* a **shorthand string** — `"string" | "number" | "integer" | "boolean" | "date" | "date-time" | "object" | "array"`
  (mapped to `{ type: ..., format: ... }`), or
* a **JSON Schema fragment** — any object with `type` / `properties` / `items` / `enum` / `format` /
  `nullable`, recursively.

`type` is required on every column of a `custom` resource (validated by `superRefine`) and optional — but allowed as an
override — on a `prisma` resource.

### `repository.ts`

```ts
import type { CustomRepository } from '@ghentcdh/crouton-api';
import type { PrismaClient } from '@np/generated/client';
import type { ZoteroItem } from './types';

const repository: CustomRepository<ZoteroItem, PrismaClient> = {
  // must return the count too — the framework builds the {data, request} envelope
  findAll: async (params, ctx) => {
    const res = await fetch(`${API}/items?limit=${params.pageSize}&start=${ctx.offset}`);
    const body = await res.json();

    // ctx.prisma is the resolved datasource client — mix external data with the DB
    const seen = await ctx.prisma.zoteroSync.findMany({
      where: { externalId: { in: body.items.map((i) => i.key) } },
    });

    return { data: merge(body.items, seen), count: body.total };
  },

  findOne: async (id, ctx) => { /* ... */
  },
  create: async (data, ctx) => { /* ... */
  },
  update: async (id, data, ctx) => { /* ... */
  },
  patch: async (id, data, ctx) => { /* ... */
  },
  delete: async (id, ctx) => { /* ... */
  },
};

export default repository;
```

### The context object

```ts
export interface CustomRepositoryContext<PRISMA = any> {
  /** Resolved datasource client for this resource (config.database, else the default). */
  prisma: PRISMA;
  /** Escape hatch for multi-database resources. */
  dataSources: { resolve(name?: string): any; entries(): { name: string; client: any }[] };
  config: Resource;
  op: 'findAll' | 'findOne' | 'create' | 'update' | 'patch' | 'delete';
  offset: number;
  id?: string | number;
}
```

`prisma` costs nothing to provide: the controller constructor already does
`registry.resolve(config.database)` and passes the client into `createCrudRepository(prisma, config)`. The custom
adapter has the same signature, so it just forwards it into every `ctx`.

Contract notes:

* `findAll` returns `{ data, count }`. Precedent: `CrudRepository.findAllByParent` already returns that shape; `count`
  is otherwise a separate repository call the user cannot sensibly implement twice.
* `params` is the parsed `ListRequest` (`page`, `pageSize`, `sort`, `sortDir`, `filter: string[]` in
  `field:value:operator` form). Helpers `parseFilterString` / `buildFilterWhere` stay exported so a user can reuse the
  grammar.
* `ctx.prisma` is typed through the interface's second generic. This is exactly why
  `CustomRepository` must be a **hand-written interface** and not a `z.infer` — `ResourceHooks` does the latter and its
  `PRISMACLIENT` generic is erased, so `ctx.prisma` is always `any` in hooks today.
* `ctx.dataSources` exposes `DataSourceRegistry.resolve` / `.entries()` (both already public) so a resource can read
  from more than one database.
* `ctx` is deliberately richer than `ReadHookContext` (`{ prisma, op }`) so auth/tenant context can be added later
  without touching every user file.
* Every function is optional; an enabled operation with no matching function is a **load-time error**
  (recorded in `resourceLoadErrorsRegistry`, shown on the status page), not a 500 at request time.

**Projects with no datasource at all.** `DataSourceRegistry.resolve()` throws (`'No default data source configured'`)
when the registry is empty, and `forResources` currently treats that throw as a fatal per-resource load error. For a
custom resource that must degrade to
`ctx.prisma === undefined` instead — a Zotero-only backend need not configure Prisma. Note the knock-on:
`CrudRepository.prisma` is on the interface and `register-actions.ts` calls
`action.procedure(this.repo.prisma, recordId)`, so actions on such a resource receive `undefined`. Either document that,
or widen the action signature to take the same `ctx`.

---

## 2. `crouton-core` — schema + view building

**Files to add**

| File                                       | Contents                                                                                                                 |
|--------------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| `src/lib/resource/ResourceKind.ts`         | `ResourceKindSchema = z.enum(['prisma', 'custom']).default('prisma')`; `ResourceKind` type                               |
| `src/lib/resource/ColumnType.schema.ts`    | `ColumnTypeSchema` (shorthand union ∪ recursive `JsonSchemaFragmentSchema` via `z.lazy`), `columnTypeToJsonSchema(type)` |
| `src/lib/view/column-type-view.builder.ts` | `buildViewsFromColumnTypes(columns, opts)` — the schema-less sibling of `buildViews`                                     |

**Files to change**

* `src/lib/resource/Column.ts` — add `type: ColumnTypeSchema.optional()`. Keep `columnType`
  (`z.string().default('string')`) working but mark it deprecated in the JSDoc; `type` wins when both are present.
* `src/lib/resource/ResourceJson.schema.ts` — add `kind: ResourceKindSchema`, add the missing
  `idType` field (see §7), make `model` `.optional()`, and add a `.superRefine` on
  `ResourceJsonSchema`:
    * `kind === 'prisma'` (or absent) ⇒ `model` required (preserves today's behaviour, since `model` is currently in
      `required`).
    * `kind === 'custom'` ⇒ `model` must be absent; `database` stays allowed and optional (it selects the client
      injected as `ctx.prisma`); every column needs a `type`; `calculatedColumns` must be empty (raw SQL needs a real
      table — see §7, bug 6).
    * exactly one `idField`, as today.
* **Do not** convert the shape to `z.discriminatedUnion`. `scripts/gen-resource-schema.mjs` runs
  `z.toJSONSchema(ResourceJsonShape)` and needs a `z.object`; a refinement keeps that working and keeps the JSON Schema
  permissive-but-documented.
* `src/lib/view/view.builder.ts` — `buildViews` gains a branch: when no Zod `schema` is supplied (or
  `kind === 'custom'`), delegate to `buildViewsFromColumnTypes`. Reuse the existing
  `applySchemaTransforms`, `patchFilterProperties`, `buildFormUiSchema`, `buildTableUiSchema`,
  `calculated-columns.builder` untouched — only the *source* of `properties` changes. The existing schema-less path
  `buildViewsFromColumns` (used for sub-resources) is the template; the new builder supersedes it for full resources and
  should eventually replace it.
* `src/lib/view/form-schema.builder.ts` — currently the `else` branch emits
  `control(fieldInput?.type ?? 'text')`, so an object-typed column gets `format: 'text'` and matches no renderer. Emit
  `format: 'object'` when the resolved column type is `object` (and `'array'` for arrays) so the new renderers in §4 can
  match. This also fixes `extend` columns today.
* Regenerate `resource.schema.json` / `resource.schema.v1.json` / `docs/.vuepress/public/schema/**`
  — CI has a `git diff --exit-code` drift guard on these.

**Versioning:** `kind`, `type` and `idType` are additive optional fields, so **stay on
`schemaVersion: 1`**; `MIGRATIONS` stays empty. `serialize.ts` should stamp `kind` in the header key order (after
`schemaVersion`) so diffs stay stable.

---

## 3. `crouton-api` — loading + the repository seam

The framework already has exactly one clean data-access seam: `CrudRepository` (interface) +
`createCrudRepository` (factory). Everything below plugs into it; controllers, `register-*`
endpoint builders and `payload-builders` are untouched.

**Files to add** — `src/lib/crud/custom-repository/`

| File                            | Contents                                                                                                                                                                                                                                                                                |
|---------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `custom-repository.types.ts`    | hand-written `CustomRepository<T, PRISMA>` + `CustomRepositoryContext<PRISMA>` interfaces, plus a loose `z.custom` schema for embedding in `ResourceSchema`. **Do not** use `z.infer` for the public type — `ResourceHooks` does, and its `PRISMACLIENT` generic is erased as a result. |
| `custom-repository.loader.ts`   | `loadCustomRepository(basePath)` = `findModule(basePath, 'repository')` + `importDefault`, but reporting failures instead of swallowing them                                                                                                                                            |
| `custom-repository.adapter.ts`  | `createCustomRepository(prisma, config, dataSources)` → a full `CrudRepository` backed by the user object; builds the per-call `ctx`                                                                                                                                                    |
| `custom-repository.validate.ts` | enabled-operations ⇄ implemented-functions check, used at module init                                                                                                                                                                                                                   |

**Files to change**

* `crud-repository.factory.ts` — one branch at the top of `createCrudRepository`:
  `if (config.kind === 'custom') return createCustomRepository(prisma, config, dataSources)`. The
  `prisma` argument is already the first parameter, so nothing new has to be threaded from the controller; only the
  `DataSourceRegistry` itself needs passing (it is already injected into the controller constructor). Also add an
  optional
  `findAllWithCount?(params): Promise<{ data: T[]; count: number }>` to the `CrudRepository`
  interface.
* `operations/register-findall.ts` — in `_findAll`, prefer `repo.findAllWithCount(params)` when present, else keep
  today's `Promise.all([findAll, count])`. Envelope construction stays here.
* `loader/index.ts` — per resource directory:
    * `schema.ts` becomes optional; only required when `kind !== 'custom'`.
    * after `readResourceJson`, if `kind === 'custom'` call `loadCustomRepository(basePath)`; a missing file with
      enabled operations ⇒ `resourceLoadErrorsRegistry.record(...)` and skip the resource.
    * keep `loadResourceHooks`, `loadActions`, `migrateResourceJsonFile`, `draft` handling as-is.
* `adapter/json-adapter.ts` (`fromJson`) — accept `kind` and the loaded repository. For custom:
    * skip Zod-dependent steps: `enrichRelationTypesFromSchema`, `pickByColumns` on the Zod schema,
      `toSelectFields`. `relationType` must then be explicit in `fieldInput` (validate it).
    * keep: `expandExtendColumns`, enum injection, field-variant resolution (`resolveFormField` etc.),
      `buildSubResources`, `buildLookup`, `definition`.
    * call the column-type view builder instead of the schema-driven one.
    * attach `repository` to the returned `Resource`.
* `resource/ResourceConfig.schema.ts` — add `kind` and `repository` (as `z.custom`) to
  `ResourceSchema`; make `model` optional there too.
* `crouton-api.module.ts` — the `prisma[c.model]` startup validation must be skipped for
  `kind === 'custom'`; replace it with `validateCustomRepository(c)`. A failure records into
  `resourceLoadErrorsRegistry` and skips the resource, matching today's non-fatal behaviour. Also: a `resolve()` throw
  (named datasource missing) stays an error, but an **empty registry** must not fail a custom resource — `ctx.prisma`
  becomes `undefined`. Same tolerance in
  `crud-controller.factory.ts`, whose constructor calls `registry.resolve(config.database)`
  unconditionally today.
* `crud.config.ts` — `isOperationEnabled` is unchanged (`definition[op] != null`), so the operations block keeps its
  current meaning. No new key, no sync problem.
* **Hooks still apply.** `beforeWrite` / `afterWrite` / `afterRead` currently live inside
  `Read/WriteRepository.prepare/postWrite/decorate`. Move those four wrappers into small shared helpers so
  `custom-repository.adapter.ts` can reuse them verbatim — otherwise custom resources silently lose hooks and the
  value-label envelope.
* Unimplemented-but-called operation ⇒ `NotImplementedException`. Note the dual-package hazard documented in
  `crouton-validation.error.ts`: prefer the existing `CroutonValidationError`-style plain-Error + `APP_FILTER` approach
  over a bare `HttpException` if this needs to cross package boundaries.

**Unchanged on purpose:** `crud-controller.factory.ts`, all `operations/register-*.ts` except
`register-findall`, `payload-builders.ts` (URIs derive from `route`, not `model`), `app-layout.builder.ts`.

---

## 4. `crouton-forms-vue` / `crouton-vue` — nested object rendering

Today an object-typed column renders the red `No renderer for #/properties/x type: Control` message in forms, and dumps
the raw object through `TableCellRender` → `ObjectValue.vue` (`<pre>`) in tables. The dispatch machinery is already
nesting-capable (`resolveSchema` walks arbitrary depth,
`useControlBinding` composes dotted paths, `ArrayRenderer.vue` is the working precedent) — only the renderers are
missing.

* **Add** `forms/renderers/controls/ObjectControlRenderer.vue` — resolves `schema.properties`, provides
  `pathPrefix` = the control's own path, re-dispatches one `Control` per property (or honours an explicit nested
  `uischema.elements` if the backend emits one). Model it on `ArrayRenderer.vue`.
* **Add** a readonly counterpart, replacing the `<pre>` fallback in `ObjectValue.vue` with a definition-list style
  nested display; keep `displayKey` short-form rendering (`{id,name}` →
  `name`) for the common relation-ish case.
* **Register** both: `controlRenderers` (rank ~12, tester `isObjectControl`) and `readonlyRenderers`.
  `testers/tester.ts:58` has `schemaTypeIs('object')` commented out in `isObjectControl` — uncomment and register it (it
  is currently dead code in no registry).
* **Fix** `crouton-core/src/lib/schema.utils.ts` `findProperty`: it strips only the
  `#/properties/` prefix, so a nested scope yields `id = "a/properties/b"` and `property = {}`. Walk the `properties`
  segments so nested **table** columns get a real column def. This also fixes
  `extend` columns and the produced-but-never-consumed `format: 'keyValue'` path.
* `RelationCell.vue` / `displayKey` handling already renders `{id, name}` objects in tables — reuse, no change.

---

## 5. `crouton-codegen` / `crouton-cli`

Custom resources are never derived from Prisma, so the main work is **guards**, plus a scaffold.

* `project.ts` `listResourceNames` / `readExistingResource` — exclude directories whose
  `resource.json` has `kind: "custom"`, so `crouton update resources` does not see them as
  "model disappeared from the database" and propose column removals.
* `plan.ts` / `diff.ts` — defensive: never emit decisions for a custom resource.
* `serialize.ts` — include `kind` in `withResourceHeader`'s key order; preserve an existing value.
* **New command** `crouton create-resource <name> --kind custom` (`crouton-cli/src/commands/`, runner modelled on
  `create-datasource/runner.ts` which already does "never clobber"):
  emits `resources/<name>/resource.json` (kind custom, one `id` column, all operations enabled) and
  `resources/<name>/repository.ts` (typed skeleton, every method `throw new Error('not implemented')`
  with a TODO). Flags: `--route`, `--title`, `--tag`, `--cwd`, `--dry-run`, `-y`. Both files `action: 'create'` so
  `commit.ts`'s skip-if-exists protects hand edits.
* Dev-tools: `dev-resources.controller.ts` should return `kind` in `GET models` output and refuse
  `pull`/`sync`/`apply` on custom resources.
* `crouton-editor-vue` — `resource-settings.schema.ts` omits `columns`/`actions`; add `kind` as a read-only display
  field so the visual builder does not offer to flip it.
  `WriteResourceJson.ts`'s raw-preserving PATCH path needs no change (unknown keys ride through).

---

## 6. Status page & docs

* `crud/status/status.service.ts` + `crouton-vue` `StatusView` — per resource show `kind`, and for custom resources
  which operations are enabled vs implemented. Missing implementations already flow through `resourceLoadErrorsRegistry`
  and will surface there.
* `docs/guide/resource/custom-resource.md` — new page: when to use it, the two files, the `CustomRepository`
  contract, the `{data,count}` envelope, filter grammar, worked example against an external HTTP API.
* Update `docs/guide/resource/resource-json.md` (`kind`, `type`), `docs/guide/resource/hooks.md` (hooks apply to custom
  resources too), `docs/guide/README.md` nav.

---

## 7. Pre-work — existing defects that block or distort this feature

Fix these first; several are directly on the path.

1. `operations/register-endpoints.ts:8-9` imports `childFindAll` / `childFindOne` from
   `register-findall` / `register-findone`, but neither is exported (both are module-private). Dead imports, but a TS
   error and an ESM link-time throw. **Blocks touching `register-findall`.**
2. `registerUpsert` (`operations/register-crud.ts`) is exported but never called — `PUT /<route>` is never registered,
   although `WriteRepository.upsert`/`upsertMany` are implemented and
   `createCrudController` validates `upsert`+`upsertOn`. Decide: wire it up, or exclude `upsert` from the
   custom-repository contract (this plan excludes it).
3. `RequestDto` vs `RequestDtoNoOffset`: the controller validates with the no-offset variant, so
   `offset` is absent at runtime and the repositories fall back to
   `(params as any).offset ?? (page-1)*pageSize`. Since `params` becomes a **public contract** for user code, reconcile
   this — either always transform (offset present) or drop `offset` from the type and expose it on `ctx`. This plan
   assumes `ctx.offset`.
4. `importDefault` (`loader/module.loader.ts`) has a bare `catch { return undefined }`, so a syntax error in a user file
   yields `undefined` with no diagnostic. For `repository.ts` that would look like "file missing". Record the error into
   `resourceLoadErrorsRegistry`.
5. `idType` is documented, written by `classify.ts` and read by `json-adapter.ts`, but **absent from
   `ResourceJsonShape`** — Zod strips it, so every resource silently falls back to `'string'`. Custom resources need it.
   Add it to the shape.
6. Top-level `table` is declared and documented but never consumed; `sql.helpers.ts` uses
   `config.model` as the table name and hardcodes `main.id` instead of `config.idField`. Relevant because it is the
   reason `calculatedColumns` cannot work for custom resources — document that restriction, and consider fixing
   `idField` while in there.
7. `ResourceHooks` is not exported from `crouton-api`'s package index even though
   `docs/guide/resource/hooks.md` tells users to import it. Export `ResourceHooks` **and** `CustomRepository`
   from `packages/crouton-api/src/index.ts` — otherwise the user's `repository.ts` cannot be typed.
8. `crouton-codegen/vitest.config.ts` has `include: ['src/**/*.test.ts']`, so `serialize.spec.ts`
   never runs. Widen the glob before adding specs there.
9. Dead/drifting code worth deleting while nearby: `crouton-codegen/src/types.ts` (210 lines, unexported, duplicates
   `db-model.ts`/`decision.ts`, and imports a non-existent
   `JsonResourceConfig` from `crouton-core`).

---

## 8. Test plan

* **crouton-core**
    * `ColumnType.schema.spec` — shorthand ↔ fragment, recursion, invalid fragments.
    * `column-type-view.builder.spec` — columns → `json_schema` + `ui_schema` for scalars, nested objects, arrays,
      enums, relations; `hiddenIn*` / `createable` / `updateable` masking; filter schema `x-field-type` / `x-values`.
    * `ResourceJson.schema.spec` — `superRefine` matrix: custom without `model` ✓, custom with `model` ✗, custom column
      without `type` ✗, prisma without `model` ✗, custom + `calculatedColumns` ✗.
    * regenerated `resource.schema.json` committed (CI drift guard).
* **crouton-api**
    * `loader.spec` additions — temp dir with a custom resource: loads without `schema.ts`; missing
      `repository.ts` records an error and is not served; broken `repository.ts` records an error.
    * `custom-repository.adapter.spec` — `findAllWithCount` envelope, `NotImplementedException`, hooks (`beforeWrite`/
      `afterWrite`/`afterRead`) applied, value-label normalisation, and the `ctx`
      shape: `prisma` resolves per `config.database`, falls back to the default datasource, and is
      `undefined` (not a throw) when the registry is empty.
    * controller-level spec — `GET /<route>/schemas` returns a `FormDefResponseZ`-valid payload and
      `GET /<route>` returns `{ data, request: { count, totalPages, ... } }`.
* **crouton-forms-vue** — `ObjectControlRenderer` mounts, binds nested dotted paths through vee-validate, and validates
  against the nested schema; readonly variant renders nested values.
* **crouton-core** — `findProperty` resolves nested scopes.
* **crouton-codegen** — `listResourceNames` skips custom dirs; `create-resource` write plan paths and skip-if-exists.

---

## 9. Suggested phasing

| Phase | Content                                                                                                                               | Depends on |
|-------|---------------------------------------------------------------------------------------------------------------------------------------|------------|
| **0** | Pre-work fixes §7 items 1, 3, 4, 5, 7, 8 (+ optional 2, 6, 9)                                                                         | —          |
| **1** | `crouton-core`: `kind`, column `type`, `idType`, `superRefine`, schema.json regen                                                     | 0          |
| **2** | `crouton-core`: `column-type-view.builder` + `form-schema.builder` object/array format                                                | 1          |
| **3** | `crouton-api`: loader, `fromJson` branch, `CustomRepository` + adapter, hook helper extraction, module validation, `findAllWithCount` | 0, 2       |
| **4** | End-to-end usable — a hand-written custom resource serves table + form + CRUD                                                         | 3          |
| **5** | `crouton-forms-vue`/`crouton-vue`: object renderers, readonly variant, `findProperty` fix                                             | 2          |
| **6** | `crouton-cli`: `create-resource --kind custom`; codegen guards; dev-tools                                                             | 1          |
| **7** | Status page, docs, release notes                                                                                                      | 3, 5, 6    |

Phases 5 and 6 are independent of each other and can run in parallel after phase 3.

---

## 10. Open points to settle during implementation

* **Sub-resources / relations between a custom and a prisma resource.** `buildSubResources` currently derives child
  routes from the relation column and the target resource's `route`, which is kind-agnostic — so it should work. But
  `ReadRepository.findAllByParent` uses
  `prisma[sub.childModel]`. Either restrict phase 1 to relations *rendered* (autocomplete/link) but not *nested-managed*
  from a custom parent, or add `findAllByParent`/`findOneChild` to the
  `CustomRepository` contract as optional methods.
* **`lookup` / autocomplete.** `payload-builders` adds `lookup: ${baseUri}?q={text}` whenever
  `findAll` is enabled, and `register-findall` appends a `${lookupLabel}:${q}` filter. A custom
  `findAll` therefore receives the search as a normal filter string — document it, and make
  `lookupLabel` resolution explicit in the config rather than inferred.
* **Caching.** External-API-backed resources will want a cache; keep it out of the framework for now and note that
  `repository.ts` is module-scoped so a user can memoise there.
* **Naming of the type field.** `type` at column level (data type) sits next to `fieldInput.type`
  (widget) and the deprecated `columnType`. If that reads as ambiguous, `dataType` is the alternative — decide before
  publishing the schema, since it is user-facing.
