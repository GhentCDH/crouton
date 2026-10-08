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
import { customComponentIs, type CustomComponentEntry } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import RatingInput from './RatingInput.vue';
import RatingStarsRenderer from './RatingStarsRenderer.vue';

export const customComponents: CustomComponentEntry[] = [
  {
    tester: customComponentIs('rating', 10),
    renderer: markRaw(RatingInput),
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

## Example: custom field renderer (RatingInput)

A field renderer uses a standard v-model interface: `modelValue` prop + `update:modelValue` emit. Define props in a
sibling `.properties.ts` file following the project convention:

```ts
// src/RatingInput.properties.ts
import type { PropType } from 'vue';

export const RatingInputProperties = {
  modelValue: { type: Number as PropType<number | null>, default: null },
};
```

```vue
<!-- src/RatingInput.vue -->
<template>
  <div class="flex gap-1">
    <button
      v-for="star in 5"
      :key="star"
      type="button"
      @click="emit('update:modelValue', star)"
      :class="star <= (modelValue ?? 0) ? 'text-yellow-400' : 'text-gray-300'"
      style="font-size: 1.5rem; background: none; border: none; cursor: pointer;"
    >
      ★
    </button>
  </div>
</template>

<script lang="ts" setup>
import { RatingInputProperties } from './RatingInput.properties.js';

const props = defineProps(RatingInputProperties);
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();
</script>
```

Wire it to the `rating` field in `resource.json`:

```json
{
  "columns": {
    "rating": {
      "hiddenInTable": false,
      "fieldInput": {
        "type": "custom",
        "options": {
          "customComponent": "rating"
        }
      }
    }
  }
}
```

The name in `options.customComponent` (`"rating"`) must match the first argument to `customComponentIs('rating', 10)`.
`fieldInput.type` must be `"custom"` — omitting it or using another type disables the custom renderer.

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
