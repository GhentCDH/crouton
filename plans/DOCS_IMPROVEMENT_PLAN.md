Status: planned
# Plan: docs improvement

Audit date: 2026-10-07 (against `2869659`, 0.0.1-alpha.80). Scope: `docs/guide`, root `README.md`, `packages/*/docs`, `packages/crouton-prisma/README.md`, the demo components.

## 1. Audit summary

| Page | Verdict | Main issues |
|---|---|---|
| `guide/README.md` | broken links | Links to `1. setup/getting-started.md` and `resource/resource-json.md` are dead. The route in the diagram should be `crouton/:formId`. |
| root `README.md` | outdated | Lists only 3 of 10 packages. Claims docs are assembled from `packages/*/docs`, but that step is disabled. No quick start. |
| `1.setup/_getting-started.md` | minor drift | Missing `--no-nx` and `--no-postgres`. Wrong `nx.json` detection path. Docker/compose step not documented. |
| `1.setup/backend.md` | outdated | `enumsFile` belongs in `crouton.json`, not `CroutonAppConfig`. `extensions` and `schemaEnricher` are missing. `forResources` is private. Endpoint table is missing ~10 routes. |
| `1.setup/frontend.md` | **broken** | `useCrouton().init(api, …)` no longer works; you need `app.use(CroutonPlugin(api, …))`. Route is `/admin/crouton/<r>`, not `/admin/form/<r>`. `showErrors` defaults to `false`. Options `autoSave`, `defaults`, `router`, `isDev` are undocumented. |
| `1.setup/manual-setup.md` | **broken** | `crouton.json` examples lack the required `title`. Uses the same broken init. `prisma.config.ts` paths are wrong, client output should be `generated/default/client`, and `clientOutput` is missing. Some paths are garbled (`../../../tsconfig.json`). |
| `1.setup/styling.md` | minor drift | `@plugin "daisyui"` is not needed; the styles ship pre-compiled via `@ghentcdh/ui`. |
| `1.setup/status.md` | minor drift | Missing `enums`, `i18n.languages`, `keyCount`. `useCroutonStatus` is not exported. Route inside the router is `crouton-status`. |
| `cli/cli.md` | outdated | Draft logic is inverted: there is only `--draft`, the default is no draft, and `-y` also means no draft. The `crouton.json` table is missing `title`, `rules`, `sidebarGroups`, `autoSave`, `i18n`. `translations` commands and several flags are missing. |
| `translations.md` | OK | Example lacks the required `dataSourcesDir`. |
| `datasource/datasource.md` | minor drift | `name` is required (it is not the folder name). `adapter` and `clientOutput` are missing. Import differs from `adapters.md`. |
| `datasource/adapters.md` | OK | The error claim for a null client is wrong. Conflicts with `custom-resource.md` on `kind` vs `adapter`. |
| `components/autosaveform.md` | minor drift | `showErrors` default is wrong. `onEvents` and the `message-buttons` slot are missing. **The demo is broken**: `AutoSaveFormDemo.vue` passes props that don't exist and renders an empty form. |
| `resource/_resource-json.md` | outdated | The underscore name breaks 6 inbound links. `idType` and `layout` are missing. Relation file naming is wrong (should be `./author.resource`). Uses `"type": "relation"` instead of `format`, `tableView` instead of `fieldTable`, and `sortDir: "section_number"`. Several fieldInput, include and calculatedColumn keys are missing. |
| `resource/actions.md` | broken example | Condition `exists: false` should be `op: "notExists"`. `blank`, `data`, `{env.VAR}` are missing. Examples use `function` instead of arrow functions. |
| `resource/custom-resource.md` | minor drift | `ctx.request`, `ctx.parent`, `patchByParent` are missing. Overlaps and contradicts `adapters.md`. |
| `resource/extensions.md` | **broken** | Describes an `extensions` normalisation that does not exist. A wrong-typed extension fails the whole parse; it is not skipped. |
| `resource/external-operations.md` | minor drift | Uses `route` where it should say `uri`. Example is invalid (column has no `type`). Per-op `security` is missing. |
| `resource/hooks.md` | outdated | Missing `beforeFindAll`/`afterFindAll` and `ctx.dataSource`. `upsert` is not a `WriteOp`. |
| `resource/security.md` | outdated | `defineResource` does not exist. Status path depends on the prefix. |
| `resource/visual-resource-builder.md` | outdated | Describes the old field modal; it now uses `ResourceSchemaEditor` + `resource-json-raw`. Dev-tools endpoints are missing. Duplicates the editor page. |
| `resource/field-inputs/*` | minor drift | Mentions `crouton generate`, which does not exist (it is `crouton update`). `custom.md` doesn't show how to register the renderer. |
| `resource/layout`, `resource-json-editor`, `resource-versioning`, `unique`, `validate-resource-json`, `_generated/*` | OK | The generator output is byte-identical to the committed files. `unique.md` has one wrong link. |
| `packages/crouton-vue/docs/*` (unpublished) | outdated | Wrong route. Lists internal renderers/components as exports. Plugin options and the `useCrouton()` return value are incomplete. |
| `packages/crouton-api/docs/README.md` (unpublished) | outdated | Wrong config keys, endpoints, peer deps. Says `FsResourceConfigLoader`; it is now `FileSystemResourceConfigLoader`. |
| `packages/crouton-core/docs/README.md` (unpublished) | minor drift | Garbled intro. `ParseSchemaInput` fields are wrong. |
| `packages/crouton-prisma/README.md` | minor drift | Peer is `prisma >=7`. ESM barrel step is missing. Same path issues as `manual-setup.md`. |

**Structural problems**
- Sidebar order and labels come from folder names (`1.setup`, `Cli`, `Components`), so the order is alphabetical, not a reading order.
- `resource/index.md` and `datasource/index.md` are empty, and `1.setup/index.md` is `# quick start`. The sidebar links to these blank pages.
- `_getting-started.md` and `_resource-json.md` have a leading underscore but are still in the sidebar, and all links to them are broken.
- There are no pages for `crouton-forms-vue` or `crouton-editor-vue`, and no explanation of how the packages relate. Most of the public API is undocumented: `openFormModal`, `useResourcesById`, `useAutoSave`, `withUniqueChecks`, `provideRenderers`, `ResourceJsonEditor` props, …
- The same facts are repeated in several places (endpoints, `crouton.json` keys, `kind` vs `adapter`), and the copies have drifted apart.
- There is no CI check for dead links or for whether the docs build on PRs.
- The repo root has ~45 `*_PLAN.md` files, which hides the README.

## 2. Target structure

The guide is organised in reading order: get running → define resources → backend → frontend → tooling → reference. Each fact lives on exactly one page, and other pages link to it.

```
docs/guide/
├── README.md                     # what crouton is, how it works (diagram), package map
├── 1.getting-started/
│   ├── index.md                  # quick start: create-crouton / add-crouton (from _getting-started)
│   ├── project-structure.md      # resources/ + data-sources/ tree, crouton.json at a glance
│   └── manual-setup.md
├── 2.resources/
│   ├── index.md                  # resource.json reference (from _resource-json, split up)
│   ├── columns.md                # columns, calculatedColumns, table cells (fieldTable)
│   ├── field-inputs/             # unchanged (generated tables)
│   ├── relations.md              # relations, include/orderBy, display mapping
│   ├── operations.md             # operations forms + external-operations merged in
│   ├── layout.md
│   ├── actions.md
│   ├── hooks.md
│   ├── unique.md
│   ├── security.md
│   ├── extensions.md
│   ├── custom-resource.md        # kind: custom — UI-only resources
│   └── versioning.md
├── 3.backend/
│   ├── index.md                  # NestJS setup (backend.md + CroutonAppConfig)
│   ├── data-sources.md           # data-source.json + adapters (merged, kind vs adapter explained once)
│   ├── custom-adapter.md
│   └── status.md
├── 4.frontend/
│   ├── index.md                  # CroutonPlugin setup + options (fixed init)
│   ├── use-crouton.md            # from packages/crouton-vue/docs, corrected
│   ├── croutonform.md            # autosaveform.md + fixed demo
│   ├── custom-renderers.md       # custom components / renderers (from form.md)
│   ├── modals-and-relations.md   # openFormModal, RelationButton/Inline
│   ├── styling.md
│   └── translations.md
├── 5.tooling/
│   ├── cli.md                    # all commands + flags, incl. translations
│   ├── resource-editor.md        # visual builder + ResourceJsonEditor merged
│   └── validator.md
└── reference/
    ├── crouton-json.md           # single source for crouton.json keys
    ├── endpoints.md              # single source for all HTTP routes
    ├── packages.md               # what each package is, peer deps
    └── parse-schema.md           # offline compile (from crouton-core docs)
```

## 3. Phases

### Phase 0: tooling (small, do first)
- [ ] `tools/doc/vuepress.mjs`:
  - [ ] strip numeric prefixes (`1.`) from sidebar labels;
  - [ ] use the `title` from each section's `index.md` frontmatter;
  - [ ] keep the `N.` prefix only for ordering;
  - [ ] skip `_*.md` files (partials) from the sidebar.
- [ ] Add a docs build to the PR workflow (`nx run docs:build`) so broken includes and pages fail CI.
- [ ] Add a dead-link check: `markdown-link-check`, or a small script over `docs/guide/**/*.md` that resolves relative links.
- [ ] Fix the `config.js` alias `crouton-forms-vue/styles.css` → `src/styles.ts`; that file doesn't exist.
- [ ] Move the root `*_PLAN.md` files into `plans/`, or archive the finished ones.

### Phase 1: fix broken content (high priority, no restructuring)
- [ ] Fix the frontend init in `frontend.md` and `manual-setup.md` to use the `CroutonPlugin` pattern from the create-crouton template.
- [ ] Fix the routes: `/admin/crouton/<resource>` and `crouton/:formId` everywhere.
- [ ] Fix `crouton.json`: add the required `title`, and move `enumsFile`/`title`/`sidebarGroups` out of `forResourceDir` options.
- [ ] Fix the Prisma paths in `manual-setup.md` + crouton-prisma README: `generated/default/client`, config-relative paths, `clientOutput`, peer `>=7`.
- [ ] Fix the CLI draft semantics in `cli.md`.
- [ ] Fix `_resource-json.md` examples: relation file naming, `format: "relation"`, `fieldTable`, `sortDir`.
- [ ] Fix the `actions.md` condition example (`op: "notExists"`).
- [ ] Rewrite the `extensions.md` behaviour section to match `extensions.spec.ts`.
- [ ] Fix `security.md` (drop `defineResource`) and `hooks.md` (`*FindAll`, `ctx.dataSource`, no `upsert`).
- [ ] Repair `AutoSaveFormDemo.vue` and the `LayoutDemo.vue` v-model.
- [ ] Rename `_getting-started.md` → `getting-started.md` and `_resource-json.md` → `resource-json.md`, and fix all inbound links.

### Phase 2: restructure (section 2)
- [ ] Move files into the new tree, using `git mv` to keep history.
- [ ] Give each section a real `index.md`.
- [ ] Split `resource-json.md` (717 lines) into index, columns, relations and operations.
- [ ] Merge `datasource.md` + `adapters.md` + the overlapping part of `custom-resource.md`, and explain `kind` (resource) vs `adapter` (datasource) once.
- [ ] Merge `visual-resource-builder.md` + `resource-json-editor.md`.
- [ ] Merge `external-operations.md` into `operations.md`.
- [ ] Create `reference/crouton-json.md` and `reference/endpoints.md`, and replace the duplicated tables in backend, cli and crouton-api README with links.
- [ ] Remove the `field-input-types.md` stub, or add a redirect in `config.js`.
- [ ] Fold the useful parts of `packages/*/docs` into the guide (use-crouton, custom renderers, parseSchema). Delete the rest, or reduce each package `docs/README.md` to a short pointer to the site. Drop the commented-out `copyMd` code.

### Phase 3: fill gaps
- [ ] Rewrite the root README: package table for all published packages, quick start (`npm create @ghentcdh/crouton`), docs link, and a dev section that reflects how the site is really built.
- [ ] Add `reference/packages.md`: crouton-vue bundles crouton-forms-vue + crouton-editor-vue; crouton-codegen is private.
- [ ] Document the missing keys: `idType`; operations `{uri, method, security}` / `{security}`; fieldInput `customRender`/`relation`/`detail`; include `orderBy`; calculatedColumn `position`/`hidden*`; action `blank`/`data`/`{env.VAR}`; `parent.idType`.
- [ ] Explain the three overlapping names: `display.customComponent`, `options.customRender` and `options.customComponent`.
- [ ] Add frontend API pages: `openFormModal`, `useResourcesById/ByUri`, `loadRuntimeConfig`, `DevResourcesPanel`, `RelationButton/Inline`.
- [ ] Add forms-vue API pages: `useAutoSave`, `withUniqueChecks`, `provideRenderers`, `provideHttpClient`, `registerZodErrorMap`.
- [ ] Document the `ResourceJsonEditor` props and draft helpers.
- [ ] Add a full CLI reference: `translations init|update`, `update translations`, `-p/--prefix`, `--cwd`, create-datasource `-t/-e/-i`, create-crouton `--no-nx/--no-postgres`.

### Phase 4: keep it current
- [ ] Generate the endpoint and `crouton.json` reference tables from code/Zod `.meta()`, the same way as the field-input docs.
- [ ] Add a PR template checkbox: "docs updated / not needed".
- [ ] Add a "last verified against version" note on the setup pages.

## 4. Code issues found during the audit (out of scope, separate tickets)
- `CORE_RESOURCE_KEYS` (`crouton-core/.../resource/extensions.ts`) is missing `layout`, so an extension named `layout` shadows it.
- The fieldInput registry has the typo `mutliSelect`, and `Integer` is capitalised (`registry.ts`).
- `crouton add datasource` (`crouton-cli/src/commands/add.ts`) is a stub that is never registered. It is dead code.
- `useCroutonStatus` is referenced in the docs but not exported. Decide whether it should be public.

## 5. Suggested order / effort
1. Phase 0 + Phase 1: one PR, ~1 day. This removes everything that is actively wrong.
2. Phase 2: one PR, mostly moves. Review the sidebar visually.
3. Phase 3: several small PRs, one per section.
4. Phase 4: when it's convenient.
