# Form

Schema-driven forms rendered with [JSON Forms](https://jsonforms.io/) and the `@ghentcdh/crouton-forms-vue` renderer
set, extended with crouton-specific renderers (e.g. relations).

- **`form.vue`** — the form view rendered by the crouton router for create/edit operations.
- **Form modal** — open a resource form in a modal from anywhere.
- **Renderers** — the custom renderer entries crouton adds on top of `@ghentcdh/crouton-forms-vue`.

## Renderers

Crouton ships three built-in renderer sets:

| Export                      | Used in                | Handles                             |
|-----------------------------|------------------------|-------------------------------------|
| `customControlRenderers`    | create/edit modals     | Relation pickers, date range inputs |
| `relationReadonlyRenderers` | view (readonly) modals | Relation display                    |
| `customCellRenderers`       | table cells            | `RelationCell` / `RecordCell` types |

Each entry follows the JSON Forms tester/renderer pattern:

```ts
{
  tester: rankWith(priority, testerFn),
    renderer
:
  markRaw(SomeVueComponent),
}
```

The tester returns a numeric rank — higher rank wins. Crouton built-ins use rank `16`; use `17` or higher to override
them.

## Custom component fields

Add `customComponent` to `fieldInput.options` to render any field with a custom Vue component. This works with any
format — including `relation`, `date-range`, or no format at all:

```json
{
  "column": "section",
  "fieldInput": {
    "format": "relation",
    "resource": "../section/resource.json",
    "options": {
      "customComponent": "work-sections",
      "sortDir": "section_number",
      "displayKey": "title"
    }
  }
}
```

Register the component via `CroutonPlugin` using `customComponents` — the same registry used for page-level custom
components (`display.customComponent`):

```ts
import { CroutonPlugin, customComponentIs } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import WorkSectionsEditor from './components/WorkSectionsEditor.vue';

const app = createApp(App);

app.use(
  CroutonPlugin(useApi(), {
    VERSION,
    customComponents: [
      { tester: customComponentIs('work-sections', 1), renderer: markRaw(WorkSectionsEditor) },
    ],
  }),
);
```

When `customComponent` is present in options, it takes priority (rank 17) over built-in renderers (rank 16).
The custom component receives `wrapper`, `value` (v-model), `appliedOptions`, `schema`, and `uischema` as props.
All `fieldInput.options` are available via `appliedOptions`.

## Adding consumer renderers

For more control, pass extra JSON Forms renderers via `CroutonPlugin`. Crouton merges consumer renderers _after_ its
built-ins so they are evaluated at higher priority:

```ts
import { rankWith, isCustomFormat, CroutonPlugin } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import MyRichTextRenderer from './MyRichTextRenderer.vue';

const app = createApp(App);

app.use(
  CroutonPlugin(useApi(), {
    VERSION,
    renderers: [
      {
        tester: rankWith(20, isCustomFormat('rich-text')),
        renderer: markRaw(MyRichTextRenderer),
      },
    ],
  }),
);
```

The three renderer slots:

- **`renderers`** — merged into both create/edit _and_ view (readonly) modal renderer lists. Use this for custom formats
  that should work in all contexts.
- **`readonlyRenderers`** — merged into view (readonly) modals only, on top of `renderers`. Use this when you need a
  genuinely different display component for readonly mode.
- **`cellRenderers`** — merged into table cell renderer lists.

See [use-crouton.md](./use-crouton.md) for the full `CroutonPlugin` API.

<!-- TODO: add live demos once mocked schema data is available in the docs site -->
