# Form

Schema-driven forms rendered with [JSON Forms](https://jsonforms.io/) and the `@ghentcdh/crouton-forms-vue` renderer set, extended with crouton-specific renderers (e.g. relations).

- **`form.vue`** — the form view rendered by the crouton router for create/edit operations.
- **Form modal** — open a resource form in a modal from anywhere.
- **Renderers** — the custom renderer entries crouton adds on top of `@ghentcdh/crouton-forms-vue`.

## Renderers

Crouton ships three built-in renderer sets:

| Export | Used in | Handles |
|---|---|---|
| `customControlRenderers` | create/edit modals | Relation pickers, date range inputs |
| `relationReadonlyRenderers` | view (readonly) modals | Relation display |
| `customCellRenderers` | table cells | `RelationCell` / `RecordCell` types |

Each entry follows the JSON Forms tester/renderer pattern:

```ts
{
  tester: rankWith(priority, testerFn),
  renderer: markRaw(SomeVueComponent),
}
```

The tester returns a numeric rank — higher rank wins. Crouton built-ins use rank `16`; use `17` or higher to override them.

## Adding consumer renderers

Pass extra renderers to `useCrouton().init()`. Crouton merges consumer renderers _after_ its built-ins so they are evaluated at higher priority:

```ts
import { rankWith, and } from '@jsonforms/core';
import { optionIsIgnoreCase } from '@ghentcdh/crouton-forms-vue';
import { markRaw } from 'vue';
import MyRichTextRenderer from './MyRichTextRenderer.vue';

useCrouton().init(useApi(), {
  VERSION: env.VERSION,
  renderers: [
    {
      // Render fields with `"format": "rich-text"` using a custom component.
      tester: rankWith(20, and(optionIsIgnoreCase('format', 'rich-text'))),
      renderer: markRaw(MyRichTextRenderer),
    },
  ],
})
```

The three renderer slots:

- **`renderers`** — merged into create/edit modal renderer lists.
- **`readonlyRenderers`** — merged into view (readonly) modal renderer lists.
- **`cellRenderers`** — merged into table cell renderer lists.

See [use-crouton.md](./use-crouton.md) for the full `init()` API.

<!-- TODO: add live demos once mocked schema data is available in the docs site -->
