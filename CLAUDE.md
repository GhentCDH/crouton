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

# General Guidelines for working with Nx

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

# Development patterns

## Adding an option to an existing field input

1. Open `packages/crouton-core/src/lib/resource/field-input/types/<type>.options.ts` and add the field using `opt()` from `../option-meta`.
2. If the option needs custom handling in codegen, open `packages/crouton-codegen/src/lib/view/form-schema.builder.ts` in `buildFormControl` and update the relevant branch.
3. Run `pnpm nx run crouton-core:build` — this regenerates JSON schemas and the `_generated/` docs.
4. Verify no drift: `git diff docs/guide/2.resources/field-inputs/_generated/`.

## Adding a new field input type (all 10 steps)

1. **Create options schema** — `packages/crouton-core/src/lib/resource/field-input/types/<type>.options.ts` (extend `BaseOptionsSchema` from `../base.options`, use `opt` from `../option-meta`).
2. **Register in registry** — `packages/crouton-core/src/lib/resource/field-input/registry.ts`: add import and add entry `['<type>', { options: <Type>OptionsSchema, schemaFile: '<type>' }]`.
3. **Add to ControlType** — `packages/crouton-core/src/lib/layout/control.builder.ts`: add `<type>: '<type>'` to the `ControlType` const.
4. **Create Vue renderer** — `packages/crouton-forms-vue/src/forms/renderers/controls/<Type>ControlRenderer.vue`.
5. **Add tester** — `packages/crouton-forms-vue/src/testers/tester.ts`: export `const is<Type>Control = and(uiTypeIs('Control'), optionIsIgnoreCase('format', ControlType.<type>))`.
6. **Register renderer** — `packages/crouton-forms-vue/src/forms/renderers/controls/index.ts`: import tester + component, add entry to `controlRenderers`.
7. **Add to CANVAS_SUPPORTED_TYPES** — `packages/crouton-editor-vue/src/canvas/type-swaps.ts`: add `'<type>'` to the `CANVAS_SUPPORTED_TYPES` Set.
8. **Add Prisma mapping** (if applicable) — `packages/crouton-codegen/src/naming.ts`: add a `case '<PrismaType>':` in `fieldInputType`.
9. **Add form-schema branch** (if options need forwarding) — `packages/crouton-core/src/lib/view/form-schema.builder.ts`: add an `else if` branch in `buildFormControl` before the generic `else`.
10. **Create docs stub** — `docs/guide/2.resources/field-inputs/<type>.md` with `<!-- @include: ./_generated/<type>.md -->`, then add a row to `docs/guide/2.resources/field-inputs/index.md`.

After all steps: `pnpm nx run crouton-core:build` + `pnpm nx run crouton-core:test`.

## Adding a resource-level option

1. Find the resource JSON schema — `packages/crouton-core/src/lib/resource/` (look for the relevant `*.schema.ts` or Column-level schema).
2. Add the field to the Zod schema, then run `pnpm nx run crouton-core:build` to regenerate `packages/crouton-core/src/lib/resource/resource.schema*.json` and `docs/.vuepress/public/schema/crouton.schema.json`.
3. If the API needs to read/forward the option, update `packages/crouton-api/src/lib/crud/adapter/` loader(s).
4. Update or add a test in `packages/crouton-core/src/lib/view/form-schema.builder.spec.ts` (for UI-schema effects) or the relevant codegen spec.
5. Verify no drift: `git diff packages/crouton-core/src/lib/resource/resource.schema*.json docs/.vuepress/public/schema/`.

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
