# Custom components and renderers

Crouton lets you replace any part of the generated UI with your own Vue component — an entire form, a single field, or
a table cell. Everything uses the same `customComponents` registry.

## Three overlapping names — which one does what

| Name                        | Set where                     | Replaces                         |
|-----------------------------|-------------------------------|----------------------------------|
| `display.customComponent`   | `resource.json` top-level     | Entire form / page for a resource|
| `fieldInput.options.customComponent` | `resource.json` column| A single form field              |
| `fieldTable.options.customComponent` | `resource.json` column| A single table cell              |

All three resolve through the **same** `customComponents` registry you pass to `CroutonPlugin`. The distinction is
only where in `resource.json` you declare the name; the registration pattern is identical.

There is no separate `options.customRender` — that name does not exist in the current codebase. Use
`options.customComponent` for field-level overrides.

## `CustomComponentEntry` shape

```ts
import type { CustomComponentEntry } from '@ghentcdh/crouton-vue';

const entry: CustomComponentEntry = {
  tester: customComponentIs('MyComponent', 10), // name + priority
  renderer: markRaw(MyComponent),              // raw Vue component
};
```

`customComponentIs(name, priority)` creates a tester function that matches when the resource.json declares that
component name. The priority (second arg) determines which tester wins when multiple match — higher wins.

## Registration

```ts
// src/custom-components.ts
import { type CustomComponentEntry, customComponentIs } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import BookCoverRenderer from './BookCoverRenderer.vue';
import RatingStarsRenderer from './RatingStarsRenderer.vue';

export const customComponents: CustomComponentEntry[] = [
  {
    tester: customComponentIs('BookCover', 10),
    renderer: markRaw(BookCoverRenderer),
  },
  {
    tester: customComponentIs('RatingStars', 10),
    renderer: markRaw(RatingStarsRenderer),
  },
];
```

```ts
// src/main.ts
import { CroutonPlugin } from '@ghentcdh/crouton-vue';
import { customComponents } from './custom-components';

app.use(
  CroutonPlugin(api, {
    router,
    customComponents,
    defaults: { '$user': currentUser },
  }),
);
```

## Example: custom field renderer (BookCoverRenderer)

A field renderer receives the current field value and all form values. Use `useControlBinding` to connect to the form:

```vue
<!-- src/BookCoverRenderer.vue -->
<script lang="ts" setup>
import { ControlElement, JsonSchema, useControlBinding } from '@ghentcdh/crouton-vue';

const props = defineProps<{
  uischema: ControlElement;
  schema: JsonSchema;
}>();

const { value, formValues } = useControlBinding(props.uischema, props.schema);
// value.value  — the current field value (reactive)
// formValues   — all form field values (reactive)
</script>

<template>
  <div class="book-cover">
    <img v-if="value.value" :src="value.value" :alt="formValues.title" class="cover-image" />
    <p v-else class="no-cover">No cover image set</p>
    <input
      :value="value.value"
      type="url"
      placeholder="https://example.com/cover.jpg"
      @input="value.value = ($event.target as HTMLInputElement).value"
    />
    <p v-if="formValues.title" class="book-title">{{ formValues.title }}</p>
  </div>
</template>
```

Register it for the `cover_url` field of the `book` resource:

```json
// resources/book/resource.json
{
  "name": "book",
  "columns": {
    "title":     { "searchable": true },
    "author":    {},
    "isbn":      {},
    "rating":    { "type": "number" },
    "cover_url": {
      "label": "Cover image",
      "fieldInput": {
        "type": "string",
        "options": {
          "customComponent": "BookCover"
        }
      }
    }
  }
}
```

The name in `options.customComponent` (`"BookCover"`) must match the first argument to `customComponentIs('BookCover', 10)`.

## Example: custom table cell renderer (RatingStarsRenderer)

A table cell renderer receives the row's full data and the cell value:

```vue
<!-- src/RatingStarsRenderer.vue -->
<script lang="ts" setup>
const props = defineProps<{
  data: Record<string, unknown>;   // full row object
  value: number;                    // cell value
  column: string;                   // column id
  options: Record<string, unknown>; // fieldTable.options
}>();

const stars = computed(() => Math.round(props.value ?? 0));
</script>

<template>
  <span class="rating-stars">
    <span v-for="i in 5" :key="i" :class="i <= stars ? 'filled' : 'empty'">★</span>
    <span class="book-title">{{ (props.data as any).title }}</span>
  </span>
</template>
```

Register it for the table cell via `fieldTable`:

```json
{
  "rating": {
    "type": "number",
    "fieldTable": {
      "options": {
        "customComponent": "RatingStars"
      }
    }
  }
}
```

## Example: replace the entire form (`display.customComponent`)

To replace the whole create/edit form for a resource:

```json
// resources/book/resource.json
{
  "display": {
    "mode": "page",
    "customComponent": "BookEditor"
  }
}
```

```ts
import { CroutonPlugin, customComponentIs } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import BookEditor from './BookEditor.vue';

app.use(
  CroutonPlugin(api, {
    customComponents: [
      { tester: customComponentIs('BookEditor', 10), renderer: markRaw(BookEditor) },
    ],
  }),
);
```

`BookEditor.vue` receives the form configuration as props and is rendered inside the crouton form wrapper.

## Custom JsonForms renderers

For lower-level control (JSON Schema format-based matching rather than name-based), register standard JsonForms renderers:

```ts
import { rankWith, isCustomFormat, CroutonPlugin } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import IsbnInput from './IsbnInput.vue';

app.use(
  CroutonPlugin(api, {
    renderers: [
      {
        tester: rankWith(20, isCustomFormat('isbn')),
        renderer: markRaw(IsbnInput),
      },
    ],
  }),
);
```

The three renderer arrays map to these contexts:

- `renderers` — create/edit modals **and** view (readonly) modals. Use for custom formats that should work in all contexts.
- `readonlyRenderers` — view (readonly) modals only, stacked on top of `renderers`.
- `cellRenderers` — table cell rendering.

Use `renderers` / `readonlyRenderers` / `cellRenderers` for format-based matching; use `customComponents` for
name-based matching. Both approaches are available and complementary.
