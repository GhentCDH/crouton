Status: planned
# Crouton — Clean Code Plan

Audit of structure, conventions, and code quality across `crouton-core`, `crouton-api`, `crouton-vue`. Findings ordered
by priority.

## Architecture verdict (good news first)

Dependency direction is correct and acyclic: `core` → `api`, `core` → `vue`, and `vue` talks to `api` only over HTTP.
Keep this. All Vue components use `<script setup lang="ts">` consistently. The problems are mostly hygiene, duplication,
and a handful of real bugs.

---

## P0 — Renaming first, then bugs

### Step 0: Renaming (do before any other change)

Execute the full naming pass from section P4b first, so every later fix lands on the final names:

- Components: `resource.vue` → `ResourceView.vue`, `DisplayInline.vue` → `RelationInlineDisplay.vue`, unify
  `RelationCell`/`'RecordCell'` terminology, move `AdminView.vue` into a domain folder, inline
  `RelationModal.properties.ts`.
- Folders: merge `src/resource/` + `src/consumable/resource/`, rename `consumable/` → `composables/`.
- Files: one convention (kebab + `.role.ts`, composables as `useX.ts`); fix the two `api.ts`, the two `builder.ts`, the
  vague schema files, api's hyphen/dot mix.
- Symbols: `Request` → `ListRequest`, `Size` → `ModalSize`, generic `renderers` exports → `relationRenderers`, api's
  `JsonSchema` → `JsonSchemaInput`.

### Bugs

1. **`resource-modal.ts` uses a stale `FormDef` shape.**
   `packages/crouton-vue/src/resource/resource-modal.ts:35,36,45` accesses `formDef.form.json_schema` etc., but
   `FormDef` now has `schemas.form`. Runtime crash for any caller of `openFormModal`. Fix or delete.

2. **`isNew` is always true in `useRelationBinding.ts:43`.**
   `const isNew = formValues || ...` — `formValues` is always a truthy object. Should be `!formValues?.id` (or similar).
   The new/existing distinction is permanently broken.

3. **`updateChild` ignores `sub.idField`** (`crouton-api/src/lib/crud/write-repository.ts:145`). Uses `where: { id }`
   while `findOneChild`/`childFindAll` correctly use `sub.idField ?? 'id'`. Sub-resources with non-standard PKs update
   the wrong record.

4. **Typechecking is effectively disabled — 123 real type errors exist.**
   No package has a working typecheck target (api's tsconfig even fails to load: `declarationMap` without
   `declaration`). Running `tsc`/`vue-tsc` manually: core = 0 errors, **api = 19 errors**, **vue = 104 errors**.
   Highlights:
    - api: `FilterOperator` doesn't exist (`read-repository.ts:47`, should be `OperatorType`); `ResourceConfig` has no
      `idField` property yet it's read in `read-repository.ts:208` and `write-repository.ts:75,98` — the config type is
      missing fields the code relies on; missing dependency `@ghentcdh/json-forms-api` (`crud-repository.factory.ts:1`);
      zod `toJSONSchema` override signatures incompatible with zod v4 (`view.builders.ts:54`, `schema.utils.ts:27`);
      local `JsonSchema` not assignable to Swagger's `SchemaObject` (`register-crud.ts:90,109,127`);
      `string | undefined` passed where `'asc' | 'desc'` required (`read-repository.ts:126`, `sql.helpers.ts:107`).
    - vue: tsconfig lib is missing `dom` — `console`, `window`, `URLSearchParams`, `AbortSignal` are all "cannot find
      name"; 23 implicit-`any` parameters (mostly `api.ts`, `resource.actions.ts`); `JsonFormModalService.openViewModal`
      doesn't exist (did you mean `openModal`? — `resource.actions.ts:84`); 6 imports of names not exported by their
      modules (TS2305); multiple `FormDef` shape mismatches confirming the stale-shape bug (#1); `AxiosInstance` indexed
      dynamically (`fetch[method]`) without index signature.
    - Fix plan: repair tsconfigs (add `declaration` or drop `declarationMap`; add `dom` to vue lib), add a `typecheck`
      target per package, wire into `nx run-many -t typecheck` + pre-commit + CI, then burn down the 123 errors starting
      with api (small) before vue.

5. **`useCrouton` sidebar isn't reactive** (`consumable/useCrouton.ts:42`). Returns `sidebar.value` (a snapshot) instead
   of the ref. Late `init()` calls leave components with a stale sidebar. Return the ref.

6. **Stale-data bug in `resource.actions.ts:92`** — `onEdit` callback ignores its `data` argument and passes closure
   `formData`. Edit modal can open with outdated record.

## P1 — Dead/debug code (quick wins, one cleanup PR)

- `DisplayInline.vue`: `console.log(props)` (line 67, violates own ESLint rule), unreachable code after `return` in
  `resolveValue` (90–98), `v-if="false"` block. Finish or strip the component.
- `consumable/resource/api.ts`: unreachable second `return` (77–78), never-called `loadDataData`,
  `// TODO snackbar error` silencing failures.
- `resource.emits.ts` is never imported — delete.
- Commented-out code in `useRelationBinding.ts:12` and `resource-modal.ts:54–56` — delete.
- Duplicate root barrel: `packages/crouton-api/index.ts` is an exact copy of `src/index.ts` — delete one.
- `getFetch(formDef)` ignores its parameter; drop the indirection until auth is actually needed.

## P2 — Duplication (single source of truth)

- **Request schema**: `crouton-vue/src/utils/request.ts` is a verbatim copy of core's `zod.types.ts` +
  `request.model.ts`. Delete it; import from `@ghentcdh/crouton-core` (already a dependency). Schema drift here means
  silent frontend/backend mismatch.
- **Filter-string parsing**: core's `getFilterValues` vs api's `parseFilterString` re-derive the same
  `field:value:operator` parsing. Move parsing to core as the canonical wire-format parser; api keeps only the Prisma
  `where` mapping.
- **Constants not used**: api defines `PRISMA_NOT_FOUND_CODE` and `DEFAULT_ID_FIELD` in `constants.ts`, then hardcodes
  `'P2025'` (write-repository, twice) and `'id'` (~8 places). Use the constants. Same for `'asc'`/`'desc'` vs core's
  `SortDirEnum`.

## P3 — Typing discipline

- ~105 `any`s (72 api, 33 vue) while `no-explicit-any` is only `warn`. Plan: burn down per package, then flip the rule
  to `error` (Prisma `any`s can get a scoped `eslint-disable` with comment).
- Type `FormSchema.zodSchema` as `ZodTypeAny`, not `any`; same for `parseValue`.
- Builder payloads returning `Record<string, unknown>` (`buildLayoutPayload` etc.) — give them real return types.
- `ResourceApi` is hand-maintained; derive it via `ReturnType<typeof useResources>` or type the factory's return
  explicitly.
- `safeFromJSONSchema` falls back to `z.any()` silently — log a warning at minimum.
- Unify zod→JSON-schema targets in api (`draft-07` vs `openApi3` used inconsistently).
- Rename api's local `JsonSchema` interface (clashes with `@jsonforms/core`'s).

## P4 — Conventions & structure alignment

Pick one layout and apply to all three packages:

- **Folder layout**: core uses `src/lib/`, api uses `src/lib/crud/`, vue uses bare `src/`. Suggest: `src/lib/<domain>/`
  everywhere; rename vue's `consumable/` to `composables/`.
- **Public API**: core `export *`s internals (`PositiveRequestNumber`, `buildFilterKey`…); vue exports almost nothing
  (`useResources`, `AdminView`, relation components unreachable). Curate explicit exports per package, use `export type`
  for types.
- **Vue files**: rename `resource.vue` → `ResourceView.vue`; migrate `RelationCell.vue` to `defineProps<{...}>()`
  generic form; inline `RelationModal.properties.ts`; type emits (`defineEmits<{ closeModal: [] }>()`); remove
  `[key: string]: any` from `DisplayInline.vue` props.
- **Packaging**: three different exports strategies — api points at `../../dist` (and `files: ["../../dist/..."]` won't
  pack correctly with npm), core ships `src` via custom condition `@ghentcdh/crouton`, vue ships local `dist`.
  Standardize on per-package `dist` with proper `exports` maps. The custom esbuild condition is fragile for non-tsup
  consumers.
- Add `"private": true` to api/vue or to none (only core has it now).

## P4a — Refactor: `ResourceView.vue` usable as a standalone component

Today `resource.vue` is hard-coupled to vue-router: `formId` comes from `route.params`, and table/modal state is synced
via `router.replace({ query })`. It cannot be dropped into a page outside the crouton router setup. Refactor:

- **Props over route**: accept `formId?: string` (or a full `formDef` object) as a prop; fall back to
  `route.params.formId` only when the prop is absent and a router is present.
- **Extract URL-state sync into a strategy**: pull the `onRequest`/`handleEvent` query-param syncing into a small
  adapter (e.g. `useRouteStateSync()`). Router mode uses it; standalone mode keeps state in local refs and emits events
  (`request-change`, `modal-event`) instead of calling `router.replace`.
- **No top-level `useRoute()`/`useRouter()` when standalone**: guard or inject them, so mounting without vue-router
  doesn't throw.
- **Export it**: add `ResourceView` to the package public API (`src/index.ts`) — currently unreachable for consumers.
- The deep-link/watch logic (open modal from `?event=view&id=...`) belongs in the router adapter, not the component
  body.

## P4b — Naming review (components & files)

### Vue components

- `resource.vue` — three violations at once: lowercase filename, single-word component name (Vue style guide requires
  multi-word), and it collides with the `Resource` *class* in `consumable/resource/resource.ts`. Rename to
  `ResourceView.vue`.
- `DisplayInline.vue` — generic name for a relation-specific child. Tightly coupled children should carry the parent
  prefix: `RelationInlineDisplay.vue`.
- `RelationCell.vue` is registered under the cell type `'RecordCell'` (`table/cells/index.ts`) — the component says
  "Relation", the wire name says "Record". Pick one term and use it everywhere.
- `AdminView.vue` sits in `src/` root while every other component lives in a domain folder. Move it (e.g.
  `src/admin/AdminView.vue` or `src/layout/`).
- `RelationModal.properties.ts` — only component with externalized props, and the file mixes PascalCase + dot-suffix.
  Inline the props into the SFC (preferred) or rename to `relation-modal.props.ts`.

### File naming — three conventions competing in crouton-vue

`resource.actions.ts` / `form-def.schema.ts` (kebab + dot-role), `useResources.ts` / `computedAsync.ts` (camelCase),
`resource-modal.ts` (plain kebab). Core adds `fromJson.builder.ts` (camelCase + dot-role) next to `create-schema.ts`
(kebab). Decide once: kebab-case with `.{role}.ts` suffix for plain modules, `useX.ts` camelCase for composables
(matching the exported symbol), then sweep.

- Two files named `api.ts` in crouton-vue (`src/api.ts`, `src/consumable/resource/api.ts`) — rename by content
  (`http-client.ts`, `resource-api.ts`).
- Generic names that say nothing: `resource/types.ts`, `table/utils.ts`, `layout/builder.ts`, `table/builder.ts`. The
  two `builder.ts` files hold the *abstract* `Builder`/`BuilderWithElements` and `TableBuilder` respectively —
  `base.builder.ts` and `table.builder.ts`.
- Three vague schema files in api's loader: `schema.helpers.ts`, `schema-transforms.ts`, plus `crud/schema.utils.ts`
  (and core has its own `schema.utils.ts`). Merge or rename by purpose (e.g. `schema-to-openapi.ts`,
  `json-schema-overrides.ts`).
- api mixes role-suffix styles: `read-repository.ts` / `write-repository.ts` (hyphen) vs `resource-config.registry.ts` /
  `request.dto.ts` / `zod-validation.pipe.ts` (dot). Standardize on `<name>.<role>.ts` → `read.repository.ts`,
  `write.repository.ts`.
- Two sibling "resource" domains in crouton-vue: `src/resource/` and `src/consumable/resource/`. Merge into one
  `src/resource/` and rename `consumable/` → `composables/` (only true composables stay there).

### Exported symbols

- `Request` (exported from core *and* duplicated in vue) shadows the global DOM `Request` type — rename to
  `ListRequest`/`CroutonRequest`.
- `Size` enum is too generic for a public export — `ModalSize`.
- `renderers` / `readonlyRenderers` exported from `resource/renderers.ts` are too generic at package level —
  `relationRenderers` / `relationReadonlyRenderers`.
- `JsonSchema` (api) clashes with `@jsonforms/core`'s `JsonSchema` — rename local one (`JsonSchemaInput`).
- `RequestSchema`, `SortDir`, `SortDirEnum` each exported from two packages (the P2 duplication) — resolves itself once
  vue imports from core.

## P5 — Robustness & ops

- **Tests**: one spec file in the entire repo (`uri.utils.spec.ts`). Vitest is already wired up. Priority order: api
  repositories (filter parsing, sub-resources, upserts) → core builders/filter/sort → vue composables. Add
  `nx run-many -t test` to root scripts and pre-commit/CI.
- **CI is off**: every workflow in `.github/workflows` is `.disabled`. Re-enable at least lint + typecheck + test.
- Replace `console.error`/`console.warn` in api (sql.helpers, action.loader) with NestJS `Logger`; failed
  calculated-column SQL currently silently returns defaults, missing action modules are silently dropped.
- `module.loader.ts` `importDefault` swallows import errors — log them; a throwing module looks identical to a missing
  one.
- Use `fs/promises` in loaders (sync I/O inside async fns), add a concurrency limit to `upsertMany`.
- Misc: `buildFilterKey` mutates its input via `.pop()`; `PositiveRequestNumber` chains `.positive().nonnegative()`
  (redundant).

---

## Suggested order of work

1. PR 1 — renaming pass (P0 step 0 / P4b): components, folders, files, symbols.
2. PR 2 — P0 bug fixes + tsconfig repair + typecheck targets.
3. PR 3 — P1 dead-code sweep (mechanical).
4. PR 4 — P2 de-duplication (core as single source of truth).
5. PR 5 — `ResourceView` standalone refactor (P4a) + export from public API.
6. PR 6 — packaging/exports standardization (P4, do before publishing anywhere).
7. Ongoing — typing burn-down (P3), tests + CI re-enable (P5).
