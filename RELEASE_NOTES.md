## 0.0.1-alpha.91 (2026-11-12)

### 🚀 Features

- **create-crouton:** scaffold a CI workflow that calls the shared workflow ([#475](https://github.com/GhentCDH/crouton/pull/475))

### 🩹 Fixes

- **book-collection-e2e:** eliminate no-non-null-assertion lint warnings ([#470](https://github.com/GhentCDH/crouton/pull/470))
- **crouton-api:** eliminate no-non-null-assertion lint warnings ([#471](https://github.com/GhentCDH/crouton/pull/471))
- **crouton-core:** eliminate all no-non-null-assertion and no-unused-vars lint warnings ([#473](https://github.com/GhentCDH/crouton/pull/473))
- **crouton-vue:** ship complete type declarations for bundled private packages ([#469](https://github.com/GhentCDH/crouton/pull/469))
- **crouton-vue:** eliminate no-explicit-any and no-unsafe-* lint warnings ([#472](https://github.com/GhentCDH/crouton/pull/472))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.90 (2026-11-10)

### 🚀 Features

- add yearOnly option to DateRangeControlRenderer ([#458](https://github.com/GhentCDH/crouton/pull/458))
- type appliedOptions in control renderers via ControlOptions<K> ([#462](https://github.com/GhentCDH/crouton/pull/462), [#461](https://github.com/GhentCDH/crouton/issues/461))
- **ci:** publish each package in a separate step with per-package release status ([#454](https://github.com/GhentCDH/crouton/pull/454))
- **crouton-cli:** add nx migrate support for resource.json schema migrations ([#457](https://github.com/GhentCDH/crouton/pull/457), [#455](https://github.com/GhentCDH/crouton/issues/455))
- **crouton-core:** allow fieldInput.options.values to restrict a shared enum ([#465](https://github.com/GhentCDH/crouton/pull/465), [#464](https://github.com/GhentCDH/crouton/issues/464))

### 🩹 Fixes

- layout.form/view with only container renders empty form ([#459](https://github.com/GhentCDH/crouton/pull/459))
- keep edit modal open on nested Escape and flush autosave on close ([#466](https://github.com/GhentCDH/crouton/pull/466))
- keep unsaved edits when relation change refreshes record ([#467](https://github.com/GhentCDH/crouton/pull/467))
- **crouton-api:** replace non-null assertions with guard checks ([#442](https://github.com/GhentCDH/crouton/pull/442))
- **crouton-forms-vue:** type useFetchOption and spec — eliminate any usage ([#444](https://github.com/GhentCDH/crouton/pull/444))
- **crouton-forms-vue:** type useReadonlyBinding composable — eliminate any usage ([#445](https://github.com/GhentCDH/crouton/pull/445))
- **crouton-forms-vue:** type form composables — eliminate any usage ([#449](https://github.com/GhentCDH/crouton/pull/449))
- **crouton-forms-vue:** type control renderer components — eliminate any usage ([#450](https://github.com/GhentCDH/crouton/pull/450))
- **crouton-ui-vue:** remove all explicit-any and non-null-assertion warnings ([#440](https://github.com/GhentCDH/crouton/pull/440))
- **crouton-vue:** type composables and utils — eliminate any usage ([#448](https://github.com/GhentCDH/crouton/pull/448))
- **crouton-vue:** type resource.actions.ts — eliminate any usage ([#443](https://github.com/GhentCDH/crouton/pull/443))
- **crouton-vue:** eliminate any usage in layout, forms, dev-tools, status ([#451](https://github.com/GhentCDH/crouton/pull/451))
- **crouton-vue:** type relation components — eliminate any usage ([#447](https://github.com/GhentCDH/crouton/pull/447))
- **crouton-vue:** type resource API layer — eliminate any in api/resource/modal/uri files ([#446](https://github.com/GhentCDH/crouton/pull/446))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.89 (2026-11-09)

### 🚀 Features

- move i18n translation foundation to frontend ([#294](https://github.com/GhentCDH/crouton/pull/294))
- add in/not_in filter operators and autocomplete exclude option ([#371](https://github.com/GhentCDH/crouton/pull/371))
- dot-path includes, filter allowlist, and sub-resource ?q= search ([#373](https://github.com/GhentCDH/crouton/pull/373))
- disable forms not in sidebar ([#356](https://github.com/GhentCDH/crouton/pull/356), [#387](https://github.com/GhentCDH/crouton/pull/387))
- **api:** forward search paths and filter allowlist into adapter and custom-repository contexts ([#388](https://github.com/GhentCDH/crouton/pull/388))
- **api:** introduce CrudContext base and shared context module ([#394](https://github.com/GhentCDH/crouton/pull/394))
- **api:** add toRepositoryContext helper and type tests ([#396](https://github.com/GhentCDH/crouton/pull/396))
- **api:** add buildCrudContext factory and thread config/dataSources into hook ctx ([#398](https://github.com/GhentCDH/crouton/pull/398))
- **api,core:** add dynamic ?include= query param for relations ([#270](https://github.com/GhentCDH/crouton/pull/270))
- **api,core,vue:** on-demand eager loading for custom child relations ([#264](https://github.com/GhentCDH/crouton/pull/264), [#386](https://github.com/GhentCDH/crouton/pull/386))
- **auth:** scaffold auth-providers libs — project structure, types, schema- #389 ([#389](https://github.com/GhentCDH/crouton/pull/389))
- **auth:** implement auth-providers logic — libs, NestJS wiring, Vue OIDC flow ([#390](https://github.com/GhentCDH/crouton/pull/390))
- **auth:** configurable scopes and refresh token support ([#395](https://github.com/GhentCDH/crouton/pull/395))
- **core:** support dot-path strings in operations.*.include ([#372](https://github.com/GhentCDH/crouton/pull/372))
- **core:** resource.json Blocks 6 & 7 — relations out of fieldInput, lookup.labels ([#374](https://github.com/GhentCDH/crouton/pull/374))
- **crouton-codegen:** default isList enum columns to multiSelect ([#272](https://github.com/GhentCDH/crouton/pull/272), [#275](https://github.com/GhentCDH/crouton/pull/275))
- **crouton-core:** add readonly and sortId to layout item schemas ([#400](https://github.com/GhentCDH/crouton/pull/400))
- **crouton-core:** add getIn, assertDefined, UnknownRecord to utils/guards ([#436](https://github.com/GhentCDH/crouton/pull/436))
- **crouton-core,crouton-forms-vue:** disabled and disabledWhen on ev… ([#232](https://github.com/GhentCDH/crouton/pull/232))
- **crouton-vue:** CRUD feedback status line in table toolbar ([#421](https://github.com/GhentCDH/crouton/pull/421))
- **crouton-vue:** action feedback in toolbar + fix i18n strings ([#426](https://github.com/GhentCDH/crouton/pull/426), [#425](https://github.com/GhentCDH/crouton/issues/425))
- **e2e:** demo fields + phases 4/7/8 control, layout, i18n specs ([#423](https://github.com/GhentCDH/crouton/pull/423))
- **status:** show sub-resources on /status page ([#276](https://github.com/GhentCDH/crouton/pull/276))
- **status:** expandable sub-resource rows with definition and form/view/table preview ([#278](https://github.com/GhentCDH/crouton/pull/278))

### 🩹 Fixes

- relation columns visible in auto-generated table/view schema ([#235](https://github.com/GhentCDH/crouton/pull/235))
- preserve autocompleteResource and repair createChild foreignKey injection ([#239](https://github.com/GhentCDH/crouton/pull/239))
- lower vee-validate peer dep floor to >=5.0.0-beta.0 ([#237](https://github.com/GhentCDH/crouton/pull/237))
- 244 empty string null ([#257](https://github.com/GhentCDH/crouton/pull/257), [#244](https://github.com/GhentCDH/crouton/issues/244))
- command references that does not exist ([#259](https://github.com/GhentCDH/crouton/pull/259))
- 243 column position ([#258](https://github.com/GhentCDH/crouton/pull/258), [#244](https://github.com/GhentCDH/crouton/issues/244), [#243](https://github.com/GhentCDH/crouton/issues/243))
- #240 sourcetable and sourcedatabase ([#261](https://github.com/GhentCDH/crouton/pull/261), [#240](https://github.com/GhentCDH/crouton/issues/240))
- confirm before deleting relation record from chip ([#266](https://github.com/GhentCDH/crouton/pull/266))
- restore publish metadata dropped by the knip PR ([#366](https://github.com/GhentCDH/crouton/pull/366), [#367](https://github.com/GhentCDH/crouton/pull/367))
- tests ([987be53](https://github.com/GhentCDH/crouton/commit/987be53))
- tests ([0acc2ed](https://github.com/GhentCDH/crouton/commit/0acc2ed))
- **api:** correct hook context on custom resources ([#359](https://github.com/GhentCDH/crouton/pull/359))
- **api:** use case-insensitive mode for ?q= text search ([#375](https://github.com/GhentCDH/crouton/pull/375))
- **auth:** map resource_access client roles and use rolesClaim in frontend ([#420](https://github.com/GhentCDH/crouton/pull/420))
- **auth:** JWKS local token verification with audience validation ([#433](https://github.com/GhentCDH/crouton/pull/433))
- **auth-nest:** type profile and done in MicrosoftStrategy validate ([#431](https://github.com/GhentCDH/crouton/pull/431))
- **auth-vue:** persist OIDC session in localStorage for refresh token support ([#432](https://github.com/GhentCDH/crouton/pull/432))
- **core:** keep a non-empty table for relation-only columns ([#358](https://github.com/GhentCDH/crouton/pull/358))
- **crouton-api:** detect SQL dialect for computed column placeholders — fixes SQLite ([#256](https://github.com/GhentCDH/crouton/pull/256), [#245](https://github.com/GhentCDH/crouton/issues/245))
- **crouton-api:** exclude computed columns from search paths ([#265](https://github.com/GhentCDH/crouton/pull/265))
- **crouton-cli:** type command opts and fix non-null assertions ([#439](https://github.com/GhentCDH/crouton/pull/439))
- **crouton-codegen:** remove non-null assertions and unsafe-access warnings in tests ([#441](https://github.com/GhentCDH/crouton/pull/441))
- **crouton-core:** layout.view/form container-only node no longer hides all columns ([#242](https://github.com/GhentCDH/crouton/pull/242), [#254](https://github.com/GhentCDH/crouton/pull/254))
- **crouton-core:** remove payload-builder wrappers by fixing relationType assignability ([#295](https://github.com/GhentCDH/crouton/pull/295))
- **crouton-core:** clear named-as-default and unused var lint warnings ([#438](https://github.com/GhentCDH/crouton/pull/438))
- **crouton-core,crouton-api:** exclude computed columns from buildLayouts to prevent duplication in table ([#247](https://github.com/GhentCDH/crouton/pull/247), [#251](https://github.com/GhentCDH/crouton/pull/251))
- **crouton-core,crouton-api:** default computed column type to 'string' instead of 'number' ([#248](https://github.com/GhentCDH/crouton/pull/248), [#253](https://github.com/GhentCDH/crouton/pull/253))
- **crouton-forms-vue:** guard parseDate with ISO_DATE_RE to prevent year strings like '1990' rendering as dates ([#249](https://github.com/GhentCDH/crouton/pull/249), [#250](https://github.com/GhentCDH/crouton/pull/250))
- **crouton-vue:** add custom onView in relationInline ([#361](https://github.com/GhentCDH/crouton/pull/361))
- **e2e:** extract typed disableAnimations helper, remove page:any in visual-regression specs ([#434](https://github.com/GhentCDH/crouton/pull/434))
- **editor-vue,backend:** remove explicit any warnings ([#435](https://github.com/GhentCDH/crouton/pull/435))
- **eslint:** configure no-unused-vars to ignore _-prefixed vars and rest siblings ([#437](https://github.com/GhentCDH/crouton/pull/437))
- **vue:** show customComponent in readonly modal and fix schema 404s ([#363](https://github.com/GhentCDH/crouton/pull/363))
- **vue:** forward custom onView handler in RelationInline to RelationButton ([#369](https://github.com/GhentCDH/crouton/pull/369))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.88 (2026-10-21)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.87 (2026-10-21)

### 🚀 Features

- table column & node options ([#207](https://github.com/GhentCDH/crouton/pull/207))
- relation config out of fieldInput → column.relation ([#211](https://github.com/GhentCDH/crouton/pull/211))
- container schema defaults ([#216](https://github.com/GhentCDH/crouton/pull/216))
- ⚠️  **crouton-core:** restructure resource schema — flatten source, layout, operations, and lookup namespaces ([#208](https://github.com/GhentCDH/crouton/pull/208))
- ⚠️  **crouton-core:** enum column defaults — single source of truth, labelKey/valueKey, warn on unknown ([#214](https://github.com/GhentCDH/crouton/pull/214))
- **crouton-editor-vue:** align to post-PR-B/C resource-json schema ([#212](https://github.com/GhentCDH/crouton/pull/212))
- **crouton-vue:** add plugin i18n language restriction ([#218](https://github.com/GhentCDH/crouton/pull/218))

### 🩹 Fixes

- formcomponent files ([e1ed88f](https://github.com/GhentCDH/crouton/commit/e1ed88f))
- **crouton-api:** read source.model for foreignKey derivation in buil… ([#215](https://github.com/GhentCDH/crouton/pull/215))
- **crouton-api:** propagate computed-column calculatedColumns to sub-resource ([#228](https://github.com/GhentCDH/crouton/pull/228))
- **crouton-core:** add migrate errors for all removed root keys ([#213](https://github.com/GhentCDH/crouton/pull/213))

### ⚠️  Breaking Changes

- **crouton-core:** enum column defaults — single source of truth, labelKey/valueKey, warn on unknown  ([#214](https://github.com/GhentCDH/crouton/pull/214))
- **crouton-core:** restructure resource schema — flatten source, layout, operations, and lookup namespaces  ([#208](https://github.com/GhentCDH/crouton/pull/208))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## Internal refactor — module consolidation (PRs #217–#227)

**No changes to `resource.json` format, HTTP routes, or OpenAPI document.**

All public `@ghentcdh/crouton-*` exports remain available (re-export bridges kept; will be removed in a later cleanup).

Canonical module locations after this refactor:

| Concern | Canonical location |
|---------|--------------------|
| JSON Schema utilities | `crouton-core/schema/json/` |
| JSON Forms builders, `ControlType` | `crouton-core/schema/ui/` |
| Column → form-control / table-cell | `crouton-core/schema/column/` |
| Response payload contracts | `crouton-core/schema/response/` |
| `ListRequest`, `SortDirEnum`, filters | `crouton-core/request/` |
| Layout schema + builders | `crouton-core/layout/` |
| API data access | `crouton-api/crud/data-access/` |
| API dev endpoints | `crouton-api/crud/dev/` (registered only when `IS_DEV`) |
| `loadConfig`/`findConfigPath` | `crouton-codegen/src/config.ts` |

Duplicate export count reduced from 152 → 140 (72 known bridges in allowlist, 0 untracked violations).

---

## 0.0.1-alpha.86 (2026-10-19)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.85 (2026-10-19)

### 🩹 Fixes

- **crouton-vue:** inline crouton-ui-vue types in published dist ([#209](https://github.com/GhentCDH/crouton/pull/209))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.84 (2026-10-16)

### 🩹 Fixes

- publish crouton-cli ([0e8ef72](https://github.com/GhentCDH/crouton/commit/0e8ef72))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.83 (2026-10-16)

### 🚀 Features

- make crouton usable by LLM agents ([#184](https://github.com/GhentCDH/crouton/pull/184))
- make crouton development LLM-friendly ([#185](https://github.com/GhentCDH/crouton/pull/185))
- Add e2e tests ([#120](https://github.com/GhentCDH/crouton/pull/120))
- move resourcedefinition to crouton-core ([#194](https://github.com/GhentCDH/crouton/pull/194))
- ⚠️  single items list per layout node, rowActions rename, table node settings ([#202](https://github.com/GhentCDH/crouton/pull/202))
- layout controls visibility — exhaustive layout items, codemod, editor, docs ([#203](https://github.com/GhentCDH/crouton/pull/203))
- **api,core,vue:** filter, search and sort on manyToOne relation columns ([#182](https://github.com/GhentCDH/crouton/pull/182))
- **i18n:** multilanguage support, UI translation layer, and e2e coverage ([#201](https://github.com/GhentCDH/crouton/pull/201))
- **vue-ui:** move the vue ui to crouton instead of external ([#186](https://github.com/GhentCDH/crouton/pull/186))
- **vue-ui:** move the vue ui to crouton instead of external ([#187](https://github.com/GhentCDH/crouton/pull/187))

### 🩹 Fixes

- search on relations ([#189](https://github.com/GhentCDH/crouton/pull/189))
- styles ([a9891bb](https://github.com/GhentCDH/crouton/commit/a9891bb))
- migration guide ([b943859](https://github.com/GhentCDH/crouton/commit/b943859))
- **api:** handle manyToMany relations and fix foreignKey casing in sub-resource builder ([#180](https://github.com/GhentCDH/crouton/pull/180))
- **create-crouton:** fixes ([#183](https://github.com/GhentCDH/crouton/pull/183))
- **crouton-core:** honour sortable/defaultSort inside table wrapper layouts ([#199](https://github.com/GhentCDH/crouton/pull/199))

### ⚠️  Breaking Changes

- single items list per layout node, rowActions rename, table node settings  ([#202](https://github.com/GhentCDH/crouton/pull/202))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## [Unreleased] — Breaking changes

### 💥 `display` / `modalSize` → `layout.form.container` / `layout.view.container`

- Root-level `display` and `modalSize` removed; move to `layout.form.container`/`layout.view.container` and `containerSize`

### 💥 `showInLookup` → `lookup.labels`

- Column-level `showInLookup` removed; replace with resource-level `lookup: { labels: [...], separator? }`

### 💥 Root `include` → `operations.findAll.include` / `operations.findOne.include`

- Top-level `include` removed; move to `operations.findAll.include` (and optionally `findOne.include` for a separate set)
- `findOne` falls back to `findAll.include` when its own `include` is absent

### 💥 `model` / `table` / `database` / `idType` → `source.*`

- Root-level datasource fields removed; move to `source: { model, dbTable, datasource, idType }`

### 💥 `calculatedColumns` → `columns[id].computed`

- Top-level `calculatedColumns` array removed; add `computed: { sql, type? }` directly to the column definition
- All other fields (`label`, `hiddenInTable`, `position`, `fieldInput`, …) remain on the column

### 💥 Layout: `controls` → `items`, `actions` → `rowActions`

- Single `items` list per layout node (order preserved)
- Table settings on the `type: "table"` node
- `actions` → `rowActions`; compiled `Table.options.actions` → `Table.options.tableActions`
- `schemaVersion` 2; table heading via `title`/`label` on the table node
- Bug fix: `sortable`/`defaultSort` now honoured inside wrapper table layouts
- **Migration for all above:** use [migrate-to-next-alpha.md](./migrate-to-next-alpha) with an AI assistant

---

## 0.0.1-alpha.82 (2026-10-08)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.81 (2026-10-07)

### 🚀 Features

- **cli:** crouton db flow ([#177](https://github.com/GhentCDH/crouton/pull/177))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.80 (2026-10-07)

### 🚀 Features

- update status view ([#174](https://github.com/GhentCDH/crouton/pull/174))
- **crouton-api:** add CRUD E2E test suite with Testcontainers ([#173](https://github.com/GhentCDH/crouton/pull/173))

### 🩹 Fixes

- form-def.schema ([1255ce6](https://github.com/GhentCDH/crouton/commit/1255ce6))
- table actions ([#175](https://github.com/GhentCDH/crouton/pull/175))
- **crouton-api:** use resolveTableActions for tableActions in buildViewsPayload ([#169](https://github.com/GhentCDH/crouton/pull/169))
- **crouton-api:** use __filename check for IS_ESM instead of import.meta ([#171](https://github.com/GhentCDH/crouton/pull/171))
- **crouton-api:** move _count into include instead of top-level findM… ([#170](https://github.com/GhentCDH/crouton/pull/170))
- **enum-registry:** resolve enumsFile relative to configDir and propa… ([#172](https://github.com/GhentCDH/crouton/pull/172))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.79 (2026-10-06)

### 🚀 Features

- make layout available in the frontend ([#167](https://github.com/GhentCDH/crouton/pull/167))
- unique async validation ([#165](https://github.com/GhentCDH/crouton/pull/165))
- **crouton-core,crouton-api:** fixture-driven tests for parseSchema ([#166](https://github.com/GhentCDH/crouton/pull/166))
- **crouton-core,docs:** generate field-input option docs from Zod .m… ([#168](https://github.com/GhentCDH/crouton/pull/168))

### 🩹 Fixes

- **crouton-forms-vue:** revalidate form after autocomplete selection ([3ade783](https://github.com/GhentCDH/crouton/commit/3ade783))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.78 (2026-10-01)

### 🩹 Fixes

- create form ([a442174](https://github.com/GhentCDH/crouton/commit/a442174))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.77 (2026-10-01)

### 🚀 Features

- **crouton-core:** type-safe fieldInput registry with per-type Zod schemas and $schema stamping ([#144](https://github.com/GhentCDH/crouton/pull/144))
- **crouton-vue:** redesign status page with issues-first layout ([#161](https://github.com/GhentCDH/crouton/pull/161))

### 🩹 Fixes

- **codegen:** load .env from schema dir so --prefix datasources are found ([#160](https://github.com/GhentCDH/crouton/pull/160))
- **codegen:** fix ESM barrel files after zod-prisma-types generation ([#159](https://github.com/GhentCDH/crouton/pull/159))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.76 (2026-09-29)

### 🚀 Features

- support resource in autocomplete ([e08352a](https://github.com/GhentCDH/crouton/commit/e08352a))
- add annotation-editor adapter ([7f6cdd8](https://github.com/GhentCDH/crouton/commit/7f6cdd8))

### 🩹 Fixes

- add repository url to package.json ([0be2d86](https://github.com/GhentCDH/crouton/commit/0be2d86))
- hiddenInForm columns must not appear in form JSON schema ([#158](https://github.com/GhentCDH/crouton/pull/158))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.75 (2026-09-23)

### 🩹 Fixes

- optional ([cfad8a9](https://github.com/GhentCDH/crouton/commit/cfad8a9))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.74 (2026-09-23)

### 🩹 Fixes

- publish crouton prisma ([60e0053](https://github.com/GhentCDH/crouton/commit/60e0053))
- publish crouton prisma ([babb906](https://github.com/GhentCDH/crouton/commit/babb906))
- **crouton-core:** normalize JSON Schema fragment shorthands in colum… ([#157](https://github.com/GhentCDH/crouton/pull/157))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.73 (2026-09-22)

### 🩹 Fixes

- no close on invalid form ([#155](https://github.com/GhentCDH/crouton/pull/155))
- docs resourcejson validator ([a1a0ac9](https://github.com/GhentCDH/crouton/commit/a1a0ac9))
- build ([da4c6d0](https://github.com/GhentCDH/crouton/commit/da4c6d0))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.72 (2026-09-22)

### 🩹 Fixes

- no close on invalid form ([#155](https://github.com/GhentCDH/crouton/pull/155))
- docs resourcejson validator ([a1a0ac9](https://github.com/GhentCDH/crouton/commit/a1a0ac9))
- build ([da4c6d0](https://github.com/GhentCDH/crouton/commit/da4c6d0))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.71 (2026-09-22)

### 🩹 Fixes

- no close on invalid form ([#155](https://github.com/GhentCDH/crouton/pull/155))
- docs resourcejson validator ([a1a0ac9](https://github.com/GhentCDH/crouton/commit/a1a0ac9))
- build ([da4c6d0](https://github.com/GhentCDH/crouton/commit/da4c6d0))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.70 (2026-09-21)

### 🩹 Fixes

- **crouton-forms-vue:** match nullable scalar types in schemaTypeIs ([#153](https://github.com/GhentCDH/crouton/pull/153))
- **crouton-forms-vue:** match integer renderer for nullable anyOf integer schema ([#154](https://github.com/GhentCDH/crouton/pull/154))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.69 (2026-09-21)

### 🚀 Features

- **crouton-core,crouton-api:** default emitObject and displayKey for… ([#147](https://github.com/GhentCDH/crouton/pull/147))
- **crouton-forms-vue:** move CroutonForm logic and add FormDebug component ([#149](https://github.com/GhentCDH/crouton/pull/149))
- **crouton-forms-vue,crouton-vue:** move FormDebug into FormComponent ([#152](https://github.com/GhentCDH/crouton/pull/152))
- **crouton-prisma:** add crouton-prisma generator, replace zod-prism… ([#148](https://github.com/GhentCDH/crouton/pull/148))
- **docs:** add live resource.json validator page ([#150](https://github.com/GhentCDH/crouton/pull/150))

### 🩹 Fixes

- click area button ([#143](https://github.com/GhentCDH/crouton/pull/143))
- **crouton-api:** derive childModel from linked resource.json model f… ([#142](https://github.com/GhentCDH/crouton/pull/142))
- **crouton-api,crouton-forms-vue:** ESM loader for .ts files and nullable date rendering ([#151](https://github.com/GhentCDH/crouton/pull/151))
- **crouton-core:** render number/integer columns with correct control… ([#141](https://github.com/GhentCDH/crouton/pull/141))
- **crouton-core:** use date/dateTime control format for date columns ([#145](https://github.com/GhentCDH/crouton/pull/145))
- **nx:** add build targetDefault dependsOn ^build for correct task ordering ([9990497](https://github.com/GhentCDH/crouton/commit/9990497))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.68 (2026-09-21)

### 🩹 Fixes

- **crouton-vue:** bundle internal workspace packages instead of marking as external ([f9dc573](https://github.com/GhentCDH/crouton/commit/f9dc573))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.67 (2026-09-21)

### 🩹 Fixes

- crouton vue ts errors ([#138](https://github.com/GhentCDH/crouton/pull/138))
- crouton vue ts errors 2 ([#139](https://github.com/GhentCDH/crouton/pull/139))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.66 (2026-09-21)

### 🩹 Fixes

- crouton vue ts errors ([#138](https://github.com/GhentCDH/crouton/pull/138))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.64 (2026-09-18)

### 🩹 Fixes

- crouton vue ts errors ([#138](https://github.com/GhentCDH/crouton/pull/138))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.63 (2026-09-18)

### 🚀 Features

- **examples:** seed in-memory SQLite on backend startup ([#135](https://github.com/GhentCDH/crouton/pull/135))

### 🩹 Fixes

- **crouton-vue:** add missing externals to rolldown config ([8fee992](https://github.com/GhentCDH/crouton/commit/8fee992))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.62 (2026-09-18)

### 🚀 Features

- disable browser cache ([#134](https://github.com/GhentCDH/crouton/pull/134))
- **examples:** add book-collection demo app ([#133](https://github.com/GhentCDH/crouton/pull/133))

### 🩹 Fixes

- demo app ([1fe06bd](https://github.com/GhentCDH/crouton/commit/1fe06bd))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.61 (2026-09-18)

### 🚀 Features

- defaults contract ([#132](https://github.com/GhentCDH/crouton/pull/132))

### 🩹 Fixes

- **crouton-vue:** default showErrors to false ([b7d4332](https://github.com/GhentCDH/crouton/commit/b7d4332))
- **crouton-vue:** export DatePicker from crouton-forms-vue re-export ([c31a8d9](https://github.com/GhentCDH/crouton/commit/c31a8d9))
- **table:** fix search and filter inputs never firing due to inheritAttrs:false ([93c3c6e](https://github.com/GhentCDH/crouton/commit/93c3c6e))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.60 (2026-09-17)

### 🚀 Features

- expose datepicker ([8b7e7a2](https://github.com/GhentCDH/crouton/commit/8b7e7a2))
- dynamic default value tokens for fieldInput ([#129](https://github.com/GhentCDH/crouton/pull/129))
- **crouton-vue:** add global showErrors and debugValue config to CroutonPlugin ([#130](https://github.com/GhentCDH/crouton/pull/130))

### 🩹 Fixes

- **table:** clear button and undefined filter values in toolbar search ([#131](https://github.com/GhentCDH/crouton/pull/131))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.59 (2026-09-16)

### 🚀 Features

- **crouton-api:** add beforeFindAll and afterFindAll resource hooks ([#128](https://github.com/GhentCDH/crouton/pull/128))

### 🩹 Fixes

- validation pipe ([adb31ee](https://github.com/GhentCDH/crouton/commit/adb31ee))
- **codegen:** replace prisma db pull with contract infer for Prisma 7 ([788afe6](https://github.com/GhentCDH/crouton/commit/788afe6))
- **codegen:** load .env in crouton, remove dotenv import from config template ([b635eab](https://github.com/GhentCDH/crouton/commit/b635eab))
- **codegen:** resolve local prisma binary to avoid npx version mismatch ([00625d1](https://github.com/GhentCDH/crouton/commit/00625d1))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.58 (2026-09-16)

### 🩹 Fixes

- Add `prisma-case-format` as a real dependency; resolve bin via `createRequire` to avoid silent ad-hoc npx download failures that left schemas in snake_case ([#127](https://github.com/GhentCDH/crouton/pull/127))
- **cli:** resolve project scope from root only, not workspace parent ([#126](https://github.com/GhentCDH/crouton/pull/126))
- **core:** detect Decimal instanceof when custom message is present ([#125](https://github.com/GhentCDH/crouton/pull/125))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.57 (2026-09-16)

### 🚀 Features

- beautify buttons ([fd19c2d](https://github.com/GhentCDH/crouton/commit/fd19c2d))

### 🩹 Fixes

- **api:** coerce inbound number/string to Prisma.Decimal in ZodValida… ([#124](https://github.com/GhentCDH/crouton/pull/124))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.56 (2026-09-16)

### 🚀 Features

- **forms:** add toggle control type ([#123](https://github.com/GhentCDH/crouton/pull/123))

### 🩹 Fixes

- **api:** coerce inbound number/string to Prisma.Decimal in ZodValidationPipe
- **api:** serialize Prisma Decimal fields as numbers in JSON responses ([#121](https://github.com/GhentCDH/crouton/pull/121))
- **api:** propagate display field from child resource.json in buildSubResources ([#122](https://github.com/GhentCDH/crouton/pull/122))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.55 (2026-09-15)

### 🚀 Features

- remove upsert operation ([#113](https://github.com/GhentCDH/crouton/pull/113))
- layout section ([#103](https://github.com/GhentCDH/crouton/pull/103))
- encodeURIComponent on ids ([bcb5e4c](https://github.com/GhentCDH/crouton/commit/bcb5e4c))
- expose form message ([#119](https://github.com/GhentCDH/crouton/pull/119))
- **core:** build json_schema from column types when no schema.ts is present ([#115](https://github.com/GhentCDH/crouton/pull/115))
- **crouton-vue:** remove idType from FormDefResponse schema ([#114](https://github.com/GhentCDH/crouton/pull/114))

### 🩹 Fixes

- build ([56979af](https://github.com/GhentCDH/crouton/commit/56979af))
- valid when no data is avalable ([88742ac](https://github.com/GhentCDH/crouton/commit/88742ac))
- **crouton-api,crouton-core:** propagate display field through sub-resource schemas ([#117](https://github.com/GhentCDH/crouton/pull/117))
- **crouton-vue:** declare vee-validate as a dependency ([b53f331](https://github.com/GhentCDH/crouton/commit/b53f331))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.54 (2026-09-09)

### 🚀 Features

- external-route operations — proxy a resource op to an external api ([#111](https://github.com/GhentCDH/crouton/pull/111))
- custom adapter ([#110](https://github.com/GhentCDH/crouton/pull/110))

### 🩹 Fixes

- external op uri not used in API payload; rename route→uri ([#112](https://github.com/GhentCDH/crouton/pull/112))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.53 (2026-09-09)

### 🚀 Features

- export parseschema from crouton-vue ([9bb8667](https://github.com/GhentCDH/crouton/commit/9bb8667))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.52 (2026-09-09)

### 🚀 Features

- type safety on resource config ([a6506d7](https://github.com/GhentCDH/crouton/commit/a6506d7))
- type safety on resource config ([5103c75](https://github.com/GhentCDH/crouton/commit/5103c75))
- **crouton-api:** add parseSchema — compile resource schema without … ([#108](https://github.com/GhentCDH/crouton/pull/108))

### 🩹 Fixes

- tests ([51956d9](https://github.com/GhentCDH/crouton/commit/51956d9))
- **crouton-api:** use config.id ?? config.route for payload id field ([#107](https://github.com/GhentCDH/crouton/pull/107))
- **crouton-core:** flatten resource extensions to top level ([#105](https://github.com/GhentCDH/crouton/pull/105))
- **crouton-core:** return empty table view for columnless resources ([#106](https://github.com/GhentCDH/crouton/pull/106))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.51 (2026-09-04)

### 🚀 Features

- crouton api controller prefix ([#100](https://github.com/GhentCDH/crouton/pull/100))
- crouton core auto kind ([#102](https://github.com/GhentCDH/crouton/pull/102))
- resource.json extension registry ([#101](https://github.com/GhentCDH/crouton/pull/101))
- **crouton-vue:** add tableComponent prop to ResourceTable ([#99](https://github.com/GhentCDH/crouton/pull/99))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Sonnet 4.6

## 0.0.1-alpha.50 (2026-09-02)

### 🩹 Fixes

- exports ([c1b304d](https://github.com/GhentCDH/crouton/commit/c1b304d))
- relase ([44dbed8](https://github.com/GhentCDH/crouton/commit/44dbed8))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.49 (2026-09-02)

### 🚀 Features

- add annotations ([be909e0](https://github.com/GhentCDH/crouton/commit/be909e0))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.48 (2026-09-01)

### 🚀 Features

- add annotations ([5eed61d](https://github.com/GhentCDH/crouton/commit/5eed61d))

### 🩹 Fixes

- inline form ([b5e8f6f](https://github.com/GhentCDH/crouton/commit/b5e8f6f))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.47 (2026-09-01)

### 🚀 Features

- **codegen:** render relations as autocomplete (manyToOne) or table (oneToMany) ([#96](https://github.com/GhentCDH/crouton/pull/96))

### 🩹 Fixes

- smaller issues ([#97](https://github.com/GhentCDH/crouton/pull/97))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.46 (2026-08-31)

### 🚀 Features

- security ([#92](https://github.com/GhentCDH/crouton/pull/92))

### 🩹 Fixes

- circulair dependency ([#93](https://github.com/GhentCDH/crouton/pull/93))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.45 (2026-08-31)

### 🚀 Features

- security ([#92](https://github.com/GhentCDH/crouton/pull/92))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.44 (2026-08-31)

### 🚀 Features

- only init crouton on first usage ([#90](https://github.com/GhentCDH/crouton/pull/90))
- security ([#91](https://github.com/GhentCDH/crouton/pull/91))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.43 (2026-08-31)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.42 (2026-08-27)

### 🩹 Fixes

- release ([d683ad7](https://github.com/GhentCDH/crouton/commit/d683ad7))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.41 (2026-08-27)

### 🚀 Features

- add i18n ([#86](https://github.com/GhentCDH/crouton/pull/86))
- use crouton form instead of autosaveform ([#87](https://github.com/GhentCDH/crouton/pull/87))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.40 (2026-08-24)

### 🚀 Features

- update docs & update ui autosave ([#83](https://github.com/GhentCDH/crouton/pull/83))
- **api:** auto-derive includes for manyToOne relations in sub-resources ([#80](https://github.com/GhentCDH/crouton/pull/80))
- **codegen:** include relations by default; hide the reverse side of a relation by default ([#75](https://github.com/GhentCDH/crouton/pull/75))
- **forms-vue:** add date control with daisyUI datepicker ([#77](https://github.com/GhentCDH/crouton/pull/77))

### 🩹 Fixes

- preserve prisma relation writes in hooks ([#79](https://github.com/GhentCDH/crouton/pull/79))
- hide errors on new form ([#84](https://github.com/GhentCDH/crouton/pull/84))
- hide errors on new form ([#85](https://github.com/GhentCDH/crouton/pull/85))
- **autocomplete:** resolve stored id back to its label on edit ([#82](https://github.com/GhentCDH/crouton/pull/82))
- **core:** map Prisma Decimal, BigInt, and Buffer to correct JSON schema types ([#76](https://github.com/GhentCDH/crouton/pull/76))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.39 (2026-08-14)

### 🚀 Features

- support default values ([#71](https://github.com/GhentCDH/crouton/pull/71))
- show enums on status page ([#73](https://github.com/GhentCDH/crouton/pull/73))
- **cli:** default new resources to non-draft; drop redundant relation fieldInput.type ([#72](https://github.com/GhentCDH/crouton/pull/72))

### 🩹 Fixes

- **vue:** unwrap isDev ComputedRef in templates ([#74](https://github.com/GhentCDH/crouton/pull/74))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.38 (2026-08-13)

### 🚀 Features

- draft & menu visibility endpoints + frontend controls ([#69](https://github.com/GhentCDH/crouton/pull/69))
- **api:** honor sort and relation override on auto-included findOne … ([#66](https://github.com/GhentCDH/crouton/pull/66))
- **canvas:** edit field options from visual canvas via right sidebar ([#65](https://github.com/GhentCDH/crouton/pull/65))

### 🩹 Fixes

- resource schemas ([#67](https://github.com/GhentCDH/crouton/pull/67))
- deps ([#68](https://github.com/GhentCDH/crouton/pull/68))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.37 (2026-08-10)

### 🚀 Features

- update CroutonPlugin for initialization ([#53](https://github.com/GhentCDH/crouton/pull/53))
- add custom format renderer for field-level custom components ([#54](https://github.com/GhentCDH/crouton/pull/54))
- relation table renderer ([#55](https://github.com/GhentCDH/crouton/pull/55))
- support custom components in table cells ([#56](https://github.com/GhentCDH/crouton/pull/56))
- resource json editor component ([#57](https://github.com/GhentCDH/crouton/pull/57))
- relation table ([#59](https://github.com/GhentCDH/crouton/pull/59))
- expose buildviews ([867934b](https://github.com/GhentCDH/crouton/commit/867934b))
- table view canvas ([#64](https://github.com/GhentCDH/crouton/pull/64))
- **cli:** normalize schema naming ([#61](https://github.com/GhentCDH/crouton/pull/61))
- **crouton-editor-vue:** live drag-and-drop form canvas ([#58](https://github.com/GhentCDH/crouton/pull/58))
- **resource:** version resource.json with auto-migration, JSON schema & draft flag ([#60](https://github.com/GhentCDH/crouton/pull/60))

### 🩹 Fixes

- multiple http request on edit ([#49](https://github.com/GhentCDH/crouton/pull/49))
- auto-save PATCH sends only changed fields instead of full form ([#50](https://github.com/GhentCDH/crouton/pull/50))
- resolve broken relation control mapping for sub-resources ([#51](https://github.com/GhentCDH/crouton/pull/51))
- redirect to main route ([#52](https://github.com/GhentCDH/crouton/pull/52))
- order sections by sectionOrder to work findOne ([eed0148](https://github.com/GhentCDH/crouton/commit/eed0148))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.36 (2026-08-04)

### 🚀 Features

- status page ([#45](https://github.com/GhentCDH/crouton/pull/45))
- add fieldView/fieldTable column variants ([#46](https://github.com/GhentCDH/crouton/pull/46))
- **crouton-core:** configure package for npm publishing ([#43](https://github.com/GhentCDH/crouton/pull/43))

### 🩹 Fixes

- patch request ([697ea16](https://github.com/GhentCDH/crouton/commit/697ea16))
- **cli:** add generated workspace deps to frontend and backend apps ([#41](https://github.com/GhentCDH/crouton/pull/41))
- **create-crouton:** use getRuntimeConfig for API_URL in frontend template ([e1fd0d9](https://github.com/GhentCDH/crouton/commit/e1fd0d9))
- **crouton-api:** include manyToOne relations and config.include ([#42](https://github.com/GhentCDH/crouton/pull/42))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6
- Claude Opus 4.8

## 0.0.1-alpha.35 (2026-07-17)

### 🚀 Features

- relation autocomplete as normal autocomplete ([e9cd67c](https://github.com/GhentCDH/crouton/commit/e9cd67c))
- **cli:** run prisma-case-format after db pull for PascalCase
  models ([0d0ac8f](https://github.com/GhentCDH/crouton/commit/0d0ac8f))

### 🩹 Fixes

- **crouton-vue:** react to query param changes in page display
  mode ([1df4b00](https://github.com/GhentCDH/crouton/commit/1df4b00))

### ❤️ Thank You

- Bo Vandersteene
- Claude Opus 4.6

## 0.0.1-alpha.33 (2026-07-16)

### 🩹 Fixes

- resource table and display ([1a40029](https://github.com/GhentCDH/crouton/commit/1a40029))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.32 (2026-07-16)

### 🚀 Features

- add separate PUT /:id and PATCH /:id support for CRUD resources ([#40](https://github.com/GhentCDH/crouton/pull/40))

### 🩹 Fixes

- **crouton-api:** exclude manyToOne relations from _count in
  findAll ([31d0c32](https://github.com/GhentCDH/crouton/commit/31d0c32))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.31 (2026-07-16)

### 🚀 Features

- **crouton-cli:** use right package versions ([8146f3a](https://github.com/GhentCDH/crouton/commit/8146f3a))

### 🩹 Fixes

- **crouton-api:** fix display mode ([8c78375](https://github.com/GhentCDH/crouton/commit/8c78375))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.30 (2026-07-16)

### 🚀 Features

- default height for app.vue ([e34b27c](https://github.com/GhentCDH/crouton/commit/e34b27c))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.29 (2026-07-16)

### 🚀 Features

- config.json ([4e71d4c](https://github.com/GhentCDH/crouton/commit/4e71d4c))
- **crouton-cli:** init db dev ([edbe5e8](https://github.com/GhentCDH/crouton/commit/edbe5e8))

### 🩹 Fixes

- building crouton-api ([0f7a0ad](https://github.com/GhentCDH/crouton/commit/0f7a0ad))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.28 (2026-07-15)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.27 (2026-07-15)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.26 (2026-07-10)

### 🚀 Features

- **create-crouton:** add --prefix option for Nx subfolder
  layout ([9c49ef6](https://github.com/GhentCDH/crouton/commit/9c49ef6))

### 🩹 Fixes

- warning on displayvalue ([f8a8162](https://github.com/GhentCDH/crouton/commit/f8a8162))
- **create-crouton:** remove crouton-core dep, add database URL
  prompt ([fab1ea8](https://github.com/GhentCDH/crouton/commit/fab1ea8))

### ❤️ Thank You

- Bo Vandersteene
- Claude Opus 4.6

## 0.0.1-alpha.25 (2026-07-10)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.24 (2026-07-10)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.23 (2026-07-10)

### 🩹 Fixes

- publish CLI packages from dist directory ([1dad20f](https://github.com/GhentCDH/crouton/commit/1dad20f))

### ❤️ Thank You

- Bo Vandersteene
- Claude Opus 4.6

## 0.0.1-alpha.22 (2026-07-09)

### 🩹 Fixes

- scope create-crouton and add-crouton under @ghentcdh ([d41a9a3](https://github.com/GhentCDH/crouton/commit/d41a9a3))
- styling ([ed56c0e](https://github.com/GhentCDH/crouton/commit/ed56c0e))

### ❤️ Thank You

- Bo Vandersteene
- Claude Opus 4.6

## 0.0.1-alpha.21 (2026-07-09)

### 🚀 Features

- add create-crouton and add-crouton CLI tools ([#36](https://github.com/GhentCDH/crouton/pull/36))

### 🩹 Fixes

- add BigInt ([#37](https://github.com/GhentCDH/crouton/pull/37))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene
- Claude Opus 4.6

## 0.0.1-alpha.20 (2026-06-30)

### 🩹 Fixes

- dropNullableFromRfequired ([ddae67c](https://github.com/GhentCDH/crouton/commit/ddae67c))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.19 (2026-06-30)

### 🩹 Fixes

- relation errors ([#34](https://github.com/GhentCDH/crouton/pull/34))

### ❤️ Thank You

- Bo Vandersteene @bovandersteene

## 0.0.1-alpha.18 (2026-06-30)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.17 (2026-06-29)

### 🩹 Fixes

- relation requirements ([15d0cfd](https://github.com/GhentCDH/crouton/commit/15d0cfd))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.16 (2026-06-29)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.15 (2026-06-29)

### 🩹 Fixes

- styling ([a36c41d](https://github.com/GhentCDH/crouton/commit/a36c41d))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.14 (2026-06-26)

### 🩹 Fixes

- styling error ([65921b0](https://github.com/GhentCDH/crouton/commit/65921b0))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.13 (2026-06-26)

### 🩹 Fixes

- cjs error ([98409f1](https://github.com/GhentCDH/crouton/commit/98409f1))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.12 (2026-06-26)

### 🩹 Fixes

- build + linking of the style.css ([c8eaf36](https://github.com/GhentCDH/crouton/commit/c8eaf36))

### ❤️ Thank You

- Bo Vandersteene

## 0.0.1-alpha.11 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.10 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.9 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.8 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.7 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.6 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.5 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.4 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.3 (2026-06-24)

This was a version bump only, there were no code changes.

## 0.0.1-alpha.2 (2026-06-24)

This was a version bump only, there were no code changes.
