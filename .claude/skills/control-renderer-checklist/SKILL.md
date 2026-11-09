---
name: control-renderer-checklist
description: Use when adding a new option to an existing control renderer (e.g. DateRangeControlRenderer, SelectControlRenderer) or creating a new renderer. Ensures the options schema in crouton-core stays in sync with the renderer implementation.
version: 0.1.0
---

# Control Renderer Checklist

Every control renderer in `crouton-forms-vue` reads its runtime options from `appliedOptions` (typed as `ControlOption | { [key: string]: any }` by jsonforms). The **canonical source of truth** for what options a renderer accepts lives in `crouton-core`.

When you add a new option to a renderer or create a new renderer, update **both** sides:

## 1. Options schema — `crouton-core`

File: `packages/crouton-core/src/lib/resource/field-input/types/<type>.options.ts`

Add the new option using `opt()`:

```ts
yearOnly: opt(z.boolean().optional(), {
  description: 'Render year-only number inputs instead of full date pickers',
  default: false,
  examples: [true],
}),
```

This schema is used for:
- JSON schema validation of `resource.json` files
- Editor autocomplete / documentation
- Generated type exports

## 2. Renderer — `crouton-forms-vue`

File: `packages/crouton-forms-vue/src/forms/renderers/controls/<RendererName>.vue`

`appliedOptions` is typed from jsonforms' `ControlOption`, which only knows about standard jsonforms options. Custom options not in `ControlOption` require a cast:

```ts
// appliedOptions is typed as ControlOption | { [key: string]: any } from jsonforms;
// custom options not in ControlOption need a cast to access without TS2339.
const yearOnly = computed<boolean>(
  () => !!((appliedOptions.value as Record<string, unknown>)?.yearOnly),
);
```

Do **not** try to remove the cast by updating `ControlOption` — it's a jsonforms type. The options schema in crouton-core is the right place for the canonical type; the renderer cast is a jsonforms accommodation.

## Checklist

- [ ] New option added to `<type>.options.ts` in crouton-core with `opt()`, description, default, and examples
- [ ] Renderer accesses the new option via `(appliedOptions.value as Record<string, unknown>)?.myOption`
- [ ] `typecheck` passes on both `crouton-forms-vue` and `crouton-editor-vue`

## Finding the right options file

| Renderer | Options file |
|---|---|
| `DateRangeControlRenderer` | `date-range.options.ts` |
| `DateControlRenderer` | `date.options.ts` (if it exists) |
| `SelectControlRenderer` | `select.options.ts` |
| New renderer | Create `<type>.options.ts` and register it |
