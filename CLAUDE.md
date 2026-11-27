# Plans directory

`plans/` contains design notes and proposals — **not** documentation. Source of truth = code + `docs/guide`. Agents: ignore `plans/archive/`.

# After implementing any change

Always run lint before committing:

```
pnpm nx run-many --target=lint --projects=<affected-packages>
```

Or for all packages: `pnpm nx run-many --target=lint`. Lint errors in CI are not caught by typecheck — run lint explicitly.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Architecture

Read `docs/guide/reference/architecture.md` before any change that crosses packages (package graph, backend boot → compile → serve, frontend payload flow, generated artefacts). Keep it updated when moving folders or adding packages.

# Development patterns

## Adding an option to an existing field input

1. Open `packages/crouton-core/src/lib/resource/field-input/types/<type>.options.ts` and add the field using `opt()` from `../option-meta`.
2. If the option needs custom handling in the form schema, open `packages/crouton-core/src/lib/schema/column/form-control.ts` in `buildFormControl` and update the relevant branch.
3. Run `pnpm nx run crouton-core:build` — this regenerates JSON schemas and the `_generated/` docs.
4. Verify no drift: `git diff docs/guide/2.resources/field-inputs/_generated/`.

## Adding a new field input type (all 10 steps)

1. **Create options schema** — `packages/crouton-core/src/lib/resource/field-input/types/<type>.options.ts` (extend `BaseOptionsSchema` from `../base.options`, use `opt` from `../option-meta`).
2. **Register in registry** — `packages/crouton-core/src/lib/resource/field-input/registry.ts`: add import and add entry `['<type>', { options: <Type>OptionsSchema, schemaFile: '<type>' }]`.
3. **Add to ControlType** — `packages/crouton-core/src/lib/schema/ui/control-type.ts`: add `<type>: '<type>'` to the `ControlType` const.
4. **Create Vue renderer** — `packages/crouton-forms-vue/src/forms/renderers/controls/<Type>ControlRenderer.vue`. Use the typed binding so `appliedOptions` matches the Zod schema:
   ```ts
   import type { ControlOptions } from '@ghentcdh/crouton-core';
   import { useCustomControlBinding } from './composables/useControlBinding';
   const { appliedOptions, ... } = useCustomControlBinding<ControlOptions<'<type>'>>()(...);
   // appliedOptions.value.<field> is now fully typed — no `as any` casts needed
   ```
5. **Add tester** — `packages/crouton-forms-vue/src/testers/tester.ts`: export `const is<Type>Control = and(uiTypeIs('Control'), optionIsIgnoreCase('format', ControlType.<type>))`.
6. **Register renderer** — `packages/crouton-forms-vue/src/forms/renderers/controls/index.ts`: import tester + component, add entry to `controlRenderers`.
7. **Add to CANVAS_SUPPORTED_TYPES** — `packages/crouton-editor-vue/src/canvas/type-swaps.ts`: add `'<type>'` to the `CANVAS_SUPPORTED_TYPES` Set.
8. **Add Prisma mapping** (if applicable) — `packages/crouton-codegen/src/naming.ts`: add a `case '<PrismaType>':` in `fieldInputType`.
9. **Add form-schema branch** (if options need forwarding) — `packages/crouton-core/src/lib/schema/column/form-control.ts`: add an `else if` branch in `buildFormControl` before the generic `else`.
10. **Create docs stub** — `docs/guide/2.resources/field-inputs/<type>.md` with `<!-- @include: ./_generated/<type>.md -->`, then add a row to `docs/guide/2.resources/field-inputs/index.md`.

After all steps: `pnpm nx run crouton-core:build` + `pnpm nx run crouton-core:test`.

## Adding a new UI component to crouton-ui-vue

After creating the component and exporting it from `packages/crouton-ui-vue/src/index.ts`:

1. **Add a demo** — pick the matching page in `docs/guide/components/` (`buttons`, `form-controls`, `cards`, `data`, `modals`, `feedback`) or create a new one. Import the component in the page's `<script setup>`, add a `## Section` with the live demo wrapped in `<ClientOnly><div class="demo">…</div></ClientOnly>` (no blank lines inside the HTML block), followed by a `vue` code snippet.
2. **New page?** Add a row to the table in `docs/guide/components/index.md`. The sidebar is auto-generated from the file system.

## Adding a resource-level option

> **Table-specific options** (`sortable`, `searchable`, `filterable`, `rowActions`, `tableActions`, `showWhen`, `hideWhen`, `disabledWhen`, `fieldTable`) belong on the **table node** (`type: "table"`) inside `layout.table`, not on columns, the resource root, or a wrapper node. See `migrate-to-next-alpha.md`.

1. Find the resource JSON schema — `packages/crouton-core/src/lib/resource/` (look for the relevant `*.schema.ts` or Column-level schema).
2. Add the field to the Zod schema, then run `pnpm nx run crouton-core:build` to regenerate `packages/crouton-core/src/lib/resource/resource.schema*.json` and `docs/.vuepress/public/schema/crouton.schema.json`.
3. If the API needs to read/forward the option, update `packages/crouton-api/src/lib/crud/adapter/` loader(s).
4. Update or add a test in `packages/crouton-core/src/lib/view/form-schema.builder.spec.ts` (re-exports from `schema/column/form-control.ts`; edit the spec in `view/` or the canonical file in `schema/column/`) or the relevant codegen spec.
5. Verify no drift: `git diff packages/crouton-core/src/lib/resource/resource.schema*.json docs/.vuepress/public/schema/`.

## Adding a new HTTP operation

1. Add `packages/crouton-api/src/lib/crud/operations/register-<name>.ts` exporting `register<Name>(ctx: OperationContext, sub?: SubResourceConfig)` (copy `register-findone.ts`).
2. Call it from `packages/crouton-api/src/lib/crud/operations/register-endpoints.ts`. Order = NestJS route priority: static paths (`/unique`, `/schemas`) **before** `:id` routes.
3. If the operation needs a `resource.json` entry, add it to `packages/crouton-core/src/lib/data-source/Operations.schema.ts`.

## Adding a compile step

1. Add the step function in `packages/crouton-core/src/lib/compile/<name>.ts`. Keep it pure — anything needing the filesystem or another resource goes through `CompileResolvers` (injected by `crouton-api/src/lib/crud/loader`).
2. Import and call it at the right point in `compileResource` (`packages/crouton-core/src/lib/compile/compile-resource.ts`).
3. Add `<name>.spec.ts` next to it; snapshots live in `packages/crouton-core/src/lib/compile/__snapshots__/`.

## Adding a data-source middleware

Middlewares run after data is fetched (value-label decoration, translations, hooks).

1. Add the middleware in `packages/crouton-api/src/lib/crud/data-access/middleware/<name>.ts`.
2. Register it in the `read.repository.ts` or `write.repository.ts` pipeline inside `data-access/`.

## Adding a layout kind

1. Add the Zod schema in `packages/crouton-core/src/lib/layout/schema/` (see `TableLayout.schema.ts`) and export it from `layout/schema/index.ts`.
2. Add the builder in `packages/crouton-core/src/lib/layout/builders/` and register it with `registerLayoutBuilder` (`layout/builders/registry.ts`). Kind must not shadow `form`/`view`/`table`/`filter`.
3. Resolve logic (visibility, defaults) goes in `layout/resolve/`.
4. Run `pnpm nx run crouton-core:build` to regenerate JSON schemas.

## Where does code go?

| Concern | Package | Folder |
|---------|---------|--------|
| Zod schemas for `resource.json` | `crouton-core` | `resource/` |
| JSON Schema utilities (`toJsonSchema`, `dropNullable`) | `crouton-core` | `schema/json/` |
| JSON Forms builders (generic, no resource.json knowledge) | `crouton-core` | `schema/ui/` |
| `ControlType` const | `crouton-core` | `schema/ui/control-type.ts` |
| Column → form-control / table-cell mapping | `crouton-core` | `schema/column/` |
| `buildFormControl` | `crouton-core` | `schema/column/form-control.ts` |
| ViewConfig assembly | `crouton-core` | `schema/view/` |
| `buildResourceDefinitions`, `DefinitionSchema` | `crouton-core` | `schema/definition/` |
| HTTP response payload contracts | `crouton-core` | `schema/response/` |
| `ListRequest`, `SortDirEnum`, filter helpers | `crouton-core` | `request/` |
| Layout schema (from `resource.json`) | `crouton-core` | `layout/schema/` |
| Layout builders (form/view/table) | `crouton-core` | `layout/builders/` |
| Operation schema | `crouton-core` | `data-source/Operations.schema.ts` |
| Action schema / resolve | `crouton-core` | `action/` |
| Compile steps (`compileResource`) | `crouton-core` | `compile/` |
| `/schemas` + `/definition` HTTP payloads | `crouton-core` | `compile/payload-builders.ts` |
| NestJS route registration (one file per op) | `crouton-api` | `crud/operations/register-*.ts` |
| Action handlers (row/table) | `crouton-api` | `crud/action/` |
| Public `/schemas` + `/definition` endpoints | `crouton-api` | `crud/operations/register-schemas.ts`, `register-schema-endpoints.ts` |
| Dev-only endpoints (resource-json editor) | `crouton-api` | `crud/dev/` |
| Prisma/in-memory adapters | `crouton-api` | `crud/data-access/adapter/` |
| Post-fetch middleware (value-labels, translations, hooks) | `crouton-api` | `crud/data-access/middleware/` |
| Query builders (filter, sort, search, select) | `crouton-api` | `crud/data-access/query/` |
| Node file I/O for `resource.json` | `crouton-api` | `crud/resource-file/` |
| `loadConfig` / `findConfigPath` | `crouton-codegen` | `src/config.ts` |
| All shared Node-only codegen/Prisma tooling | `crouton-codegen` | `src/` |

## Updating dependencies (keeps `create-crouton` scaffolds in sync)

Scaffolded projects (`create-crouton`, `crouton create project`) do **not** hardcode most versions. Templates use `{{dep:<name>}}` tokens, resolved at build time by `tools/template-dep-versions.mjs` from (first wins):

1. `examples/book-collection/apps/{backend,frontend}/package.json` — the reference consumer project
2. root `package.json`
3. `pnpm` = root `packageManager`

After **any** dependency bump:

1. Bump the example apps too when the dep is something a consumer installs (nest, prisma, vue, vite, typescript, …) — that is what new projects get.
2. `pnpm nx run crouton-cli:test` — `template-deps.spec.ts` fails if a template hardcodes a range crouton knows, or if a scaffolded major mismatches crouton-api / crouton-vue peers.
3. Deps not used anywhere in crouton stay literal in `packages/create-crouton/templates/**/package.json.tmpl` (`@nestjs/config`, `@nestjs/cli`, `pg`, `esbuild-plugin-swc`, `vee-validate`). On a major bump of nest/prisma check these with `npm view <pkg> peerDependencies`.
4. TypeScript: scaffolds use the example's `typescript` (currently `~5.9`; `crouton-prisma`/`crouton-mcp` peer `^5`). Move it together with Nx and those peers, never alone.
5. Before a release (or after changing templates / public API config): `node tools/scaffold-smoke.mjs` — scaffolds with the local build, installs packed crouton packages, runs peers check + build + typecheck + lint. Same as the `scaffold-smoke` CI job.

After **removing** a dependency:

1. Also remove it from the CLI / scaffold side: `git grep -n <name>` and clean every hit in `packages/crouton-cli`, `packages/create-crouton` (`templates/**` — `package.json.tmpl`, `pnpm-workspace.yaml.tmpl` `peerDependencyRules` / `allowBuilds` / `onlyBuiltDependencies`), `tools/template-dep-versions.mjs`, and the example apps.
2. Drop it from tsup `external` lists and `docs/guide/reference/packages.md` + `packages/crouton-core/agent-docs/reference/packages.md`.
3. `pnpm install`, then `pnpm nx run-many --targets=lint,typecheck,test --projects=crouton-cli,create-crouton,<owning-package>`.

# Package Boundaries

- `crouton-core` — browser-safe shared code (types, schemas, utilities). No Node-only imports (`child_process`, `fs`, etc.)
- `crouton-codegen` — all shared Node-only codegen/prisma tooling. Both `crouton-cli` and `crouton-api` depend on it for prisma shell wrappers, introspection, scaffolding, etc. Put shared codegen logic here, not in cli or api

# Code Style Preferences

- Always use arrow function syntax for all functions: `const foo = () => { ... }` (not `function foo() { ... }`)
- Vue component props must use runtime object syntax (not type-based `defineProps<{...}>()`), defined in a separate `*.properties.ts` file next to the component. Example:
  ```ts
  // MyComponent.properties.ts
  export const MyComponentProperties = {
    label: { type: String, required: true as const },
    value: { type: Object as PropType<unknown>, required: true as const },
  };
  ```
  ```ts
  // MyComponent.vue
  import { MyComponentProperties } from './MyComponent.properties';
  const props = defineProps(MyComponentProperties);
  ```

## User-visible strings

Any user-visible string added to crouton-vue MUST go through `useLanguage().t('key', 'English fallback')`.
Add the key to `packages/crouton-vue/src/i18n/ui-defaults.ts` under the appropriate namespace.
Never hardcode English strings directly into templates or composable logic.

# Branches for AI-authored work

AI agents (Claude Code, Copilot, Codex, …) must start every branch name with `claude/` (or `ai/`, `copilot/`,
`codex/`), e.g. `claude/feat/date-filter`. The `merge-gate` workflow then labels the PR `needs review` and blocks
merging until a human removes the label. See `.github/rulesets/README.md`.
