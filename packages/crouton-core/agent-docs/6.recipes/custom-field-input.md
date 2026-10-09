---
description: Create a custom field input component, register it with CroutonPlugin, and reference it from resource.json.
---

# Custom field input

Use this when the built-in field inputs (`textarea`, `select`, `autocomplete`, etc.) do not cover your use case.

## Steps

### 1. Create the Vue component

```vue
<!-- src/components/RatingInput.vue -->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Number, default: null },
  appliedOptions: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['update:modelValue']);

const rating = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});
</script>

<template>
  <div class="rating-input">
    <button
      v-for="n in (appliedOptions.max ?? 5)"
      :key="n"
      :class="{ active: rating >= n }"
      type="button"
      @click="rating = n"
    >
      {{ n }}
    </button>
  </div>
</template>
```

The component receives:
- `modelValue` — the current field value (v-model)
- `appliedOptions` — the `fieldInput.options` object from `resource.json`

Emit `update:modelValue` to write back to the form.

### 2. Register in `CroutonPlugin`

```ts
// src/custom-components.ts
import { customComponentIs, type CustomComponentEntry } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import RatingInput from './components/RatingInput.vue';

export const customComponents: CustomComponentEntry[] = [
  {
    tester: customComponentIs('rating', 10),
    renderer: markRaw(RatingInput),
  },
];
```

```ts
// src/main.ts
import { CroutonPlugin } from '@ghentcdh/crouton-vue';
import { customComponents } from './custom-components';

app.use(CroutonPlugin(apiUrl, { customComponents }));
```

### 3. Reference from `resource.json`

Set `fieldInput.type` to the registered name. Pass any component-specific config under `fieldInput.options`:

```json
"rating": {
  "label": "Rating",
  "fieldInput": {
    "type": "rating",
    "options": {
      "max": 5
    }
  }
}
```

### 4. Validate

```sh
npx crouton validate resources/book/resource.json
```

`crouton validate` does not check that a component name is registered (that is a runtime concern), but it will catch typos in the field shape.

## Complete example

Full `resource.json` for a resource with a custom rating field:

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "name": "book",
  "model": "Book",
  "title": "Books",
  "columns": {
    "id": { "idField": true, "hiddenInForm": true },
    "title": { "searchable": true, "sortable": true },
    "rating": {
      "label": "Rating",
      "hiddenInTable": true,
      "fieldInput": {
        "type": "rating",
        "options": {
          "max": 5
        }
      }
    }
  }
}
```

## Custom table cell renderer

To replace only the table cell (not the form field), use `fieldTable.options.customComponent` instead:

```json
"rating": {
  "label": "Rating",
  "fieldInput": { "type": "rating" },
  "fieldTable": {
    "options": { "customComponent": "RatingStars" }
  }
}
```

Register `RatingStars` the same way as above. See [Custom renderers](../4.frontend/custom-renderers.md) for the full API.
