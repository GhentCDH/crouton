# Plan — `schema.ts` obsolete when columns declare their `type` (any `kind`)

## Problem

Given a `resource.json` whose `columns` fully declare their `type`:

```jsonc
{
  "id": "example",
  "database": "annotation-db",
  "operations": { "findOne": true, "create": true, "update": true, "delete": true },
  "columns": {
    "register": {
      "type": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" } } },
      "fieldInput": { "type": "autocomplete", "options": { "resource": "/register/resource.json", "valueKey": "id", "labelKey": "name" } }
    }
  }
}
```

…the column types are enough to describe the data shape, so a sibling `schema.ts` is redundant.
Today they are **ignored** unless the resource also sets `kind: "custom"`.

### Why it fails today

- `ResourceKindSchema` defaults to `prisma`. No `kind` + no `model` ⇒ `kind: "prisma"`
  (`ResourceJson.schema.ts` preprocess only auto-derives `prisma`, never `custom`).
- Both compile paths branch on `kind`:
  - `compileResource` (`crouton-core/src/lib/compile/compile-resource.ts:70`)
  - `fromJson` (`crouton-api/src/lib/crud/adapter/json-adapter.ts:93`)

  ```ts
  let views = isCustom
    ? buildViewsFromColumnTypes(enrichedColumns) // columns → json_schema
    : buildViews(schema, enrichedColumns);       // schema.ts (Zod) → json_schema
  ```
- For a `prisma` resource with no `schema.ts`, `schema` is `undefined`, so
  `buildViews(undefined, cols)` → `buildViewsWithSource(undefined, cols)` →
  `buildView` returns `undefined` (guard at `view.builder.ts:238`, `!source`).
  Result: no `form`/`filter`/`view` json_schema, an empty table view — the typed
  columns produce nothing. So `kind: "custom"` is currently the *only* switch that
  turns column types into a json_schema.

## Insight — `kind` conflates two orthogonal axes

`kind` currently decides **two independent things**:

1. **Data access** — where rows come from (Prisma model vs user `repository.ts`).
2. **Schema source** — where the json_schema comes from (`schema.ts` Zod vs column `type`s).

Axis 1 has **already been moved off `kind`** onto the datasource adapter. See
`crouton-api.module.ts:78-79`:

> `// Dispatch branches on the adapter kind, not on config.kind.`
> `// config.kind controls schema source only (prisma = schema.ts, custom = columns).`

So the *only* remaining job of `kind` is axis 2 — and axis 2 is exactly what the user
wants free of `kind`. The fix is to make **schema source derived, not declared**.

## Proposed model

**Schema source is implicit:** a `schema.ts` (Zod default export) is present ⇒ use it;
absent ⇒ build the json_schema from the columns' `type`s. This holds for **every** `kind`.

Consequences:
- A default (`prisma`) resource with typed columns and **no** `schema.ts` just works.
- `kind: "custom"` keeps working (it never has a `schema.ts`, so it takes the columns
  path automatically — the existing behaviour, now as a *special case* of the general rule).
- `kind` becomes purely about data access (custom `repository.ts`) and its associated rules
  (`model` forbidden, `parent` allowed, etc.), decoupled from schema generation.

Recommendation: **implicit** (no new field). Add an explicit override only if a future need
appears (see Open questions).

## Changes

### 1. `crouton-core` — make column types the fallback source

`view.builder.ts` — the single behavioural change:

```ts
// buildViews: when there is no Zod schema, fall back to the column-type source
export const buildViews = (schema, columns) =>
  buildViewsWithSource(schema ? zodSchemaSource(schema) : columnTypeSchemaSource, columns);
```

Then drop the `isCustom` branch in `compileResource` — `buildViews(schema, cols)` now
covers both cases:

```ts
let views = buildViews(schema, enrichedColumns);
```

`buildViewsFromColumnTypes` stays as a named export (sub-resources / explicit callers) but
is no longer the gate. `applyRequiredColumns` already supplies `required` from column flags
on the columns path, so form validation keeps working with no Zod model.

### 2. `crouton-api` — same change in the runtime adapter

`json-adapter.ts` `fromJson`: replace the `isCustom ? buildViewsFromColumnTypes : buildViews`
branch with `buildViews(schema, enrichedColumns)`. Keep the *other* `isCustom` uses
(sub-resources skipped, repository wiring) — those are data-access concerns and stay tied to
`kind`/adapter.

### 3. Validation — require a `type` on every column when there is no `schema.ts`

Today `refineByKind` (`ResourceJson.schema.ts`) enforces "every non-relation column needs a
`type`" **only** for `kind: "custom"`. The general rule is "…when the resource has no
`schema.ts`", but core validation is pure (no fs) and cannot see sibling files. Two options:

- **(a) Load-time check (recommended).** In the loader / `resource-config.validator.ts`,
  where `schemaFile` presence is known (`loader/index.ts:68`), reject a resource that has
  neither a `schema.ts` nor a `type` on each non-relation column, with the same message.
- **(b) Permissive.** Let a typeless non-relation column fall back to `string`
  (`columnToJsonSchemaProperty` → `columnTypeToJsonSchema(undefined)`), emit a dev warning.

Keep the `custom`-specific `superRefine` message too (fast feedback in the editor), now as a
subset of the load-time rule.

### 4. Codegen (`crouton update resources`, `apply.ts`) — follow-up, not blocking

- Runtime already works once 1-3 land; a hand-written `schema.ts` can simply be deleted.
- To let codegen *stop generating* `schema.ts`: teach `apply.ts` to write a `type` onto each
  column (from Prisma introspection / the Zod model) and skip the `schema.ts` file when every
  column is typed. `schema.ts` generation stays for back-compat / resources that opt to keep it.
- `project.ts` "detect sibling schema.ts" logic is unaffected.

### 5. Docs / JSON Schema

- Update `ResourceKind` doc: `kind` no longer implies schema source; `schema.ts` is optional
  whenever columns are typed.
- No `resource.schema.json` regen needed (no new keys) unless option (b)/explicit field chosen.

## Back-compat

| Existing setup | After |
|---|---|
| `prisma` + `model` + `schema.ts` | unchanged (Zod source) |
| `custom` + `repository.ts`, no `schema.ts` | unchanged (columns source) |
| `prisma`, typed columns, **no** `schema.ts` | **now works** (was empty views) |
| `prisma`, no `schema.ts`, some columns typeless | rejected (a) or `string` fallback (b) |

No `schemaVersion` bump — no wire-contract or field change (implicit option).

## Edge cases

- **Autocomplete / relation columns** — already emit a typeless / referenced-resource shape
  (`columnToJsonSchemaProperty`, the `relation`/`autocomplete` skip in `refineByKind`); the
  user's `register` column is covered.
- **calculatedColumns** — allowed on `prisma`, forbidden on `custom`; unchanged.
- **`idType` / `idField`** — resolved from columns as today; make sure the columns path honours
  `idType` (see the historical bug 4 in `custom_resource_kind` memory).
- **Mixed resource** — `schema.ts` present AND columns typed: Zod source wins (column `type`
  is an override only, as documented on `Column.type`).

## Test plan

- `crouton-core`: `compile-resource` + `column-type-view.spec` — a `prisma` (default-kind)
  resource, no schema, typed columns → full `table/form/filter/view` json_schema; assert the
  autocomplete-object column matches the `custom` output.
- `buildViews(undefined, cols)` unit test → non-empty views (was `undefined`).
- `crouton-api`: `json-adapter` — `fromJson` with `kind` absent + no schema → served views.
- Validator: no-schema + typeless non-relation column → recorded load error (option a).
- Regression: existing `prisma`+`schema.ts` and `custom`+`repository.ts` fixtures unchanged.
- Run affected only (per repo: `nx run-many -t typecheck` is not green on main — compare error
  *sets* before/after, don't expect zero).

## Open questions

1. **Implicit vs explicit.** Implicit ("no schema.ts ⇒ columns") is least config and matches
   the ask. An explicit `schemaSource: "columns" | "schema"` (orthogonal to `kind`, mirroring
   the adapter split) is more discoverable but adds surface. Recommend implicit now.
2. **Validation strictness** — option (a) hard error vs (b) `string` fallback + warning.
3. **Codegen scope** — ship 1-3 (runtime) first; codegen `schema.ts`-drop as a second PR.

## Suggested commits

1. `feat(core): build json_schema from column types when no schema.ts is present`
   (view.builder fallback + drop `isCustom` view branch in compile-resource)
2. `feat(api): use column-type schema source for any kind without schema.ts`
   (json-adapter `fromJson`)
3. `feat(core): require column type when a resource has no schema.ts` (validator/loader)
4. `docs: schema.ts is optional whenever columns declare their type`
5. *(follow-up)* `feat(codegen): emit column types and skip schema.ts generation`
