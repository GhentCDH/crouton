---
description: Build a custom layout component (tabs as example), register it in customComponents, and use it from layout.form / layout.view.
---

# Custom layout (tabs)

Use this when the built-in layout nodes (`grid`, `vertical`, `horizontal`, `collapse`, `group`) are not enough — for
example to split a long form into tabs. All tabs stay one form with a single Save.

## Steps

### 1. Create the layout component

The component receives `elements` — one built UI-schema element per entry in the node's `items` — and renders each
with `Dispatch`.

```vue
<!-- src/components/TabsLayout.vue -->
<script setup lang="ts">
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { Dispatch } from '@ghentcdh/crouton-forms-vue';
import { type PropType, ref } from 'vue';

defineProps({
  elements: { type: Array as PropType<UISchemaElement[]>, required: true },
  schema: { type: Object as PropType<JsonSchema>, required: true },
});

const active = ref(0);
const titleOf = (el: UISchemaElement, i: number) =>
  (el.options?.title as string | undefined) ?? `Tab ${i + 1}`;
</script>

<template>
  <div role="tablist" class="tabs tabs-bordered">
    <button
      v-for="(el, i) in elements"
      :key="i"
      role="tab"
      type="button"
      :class="['tab', { 'tab-active': active === i }]"
      @click="active = i"
    >
      {{ titleOf(el, i) }}
    </button>
  </div>
  <!-- v-show, not v-if: hidden tabs stay mounted so their fields keep validating -->
  <div v-for="(el, i) in elements" v-show="active === i" :key="i" role="tabpanel" class="pt-4">
    <Dispatch :uischema="el" :schema="schema" />
  </div>
</template>
```

Besides `elements` and `schema`, the component also gets `data` (current record), `readonly`, `uischema` and every key
of the node's `props`.

### 2. Register in `CroutonPlugin`

```ts
// src/custom-components.ts
import { customComponentIs, type CustomComponentEntry } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import TabsLayout from './components/TabsLayout.vue';

export const customComponents: CustomComponentEntry[] = [
  { tester: customComponentIs('Tabs', 10), renderer: markRaw(TabsLayout) },
];
```

```ts
// src/main.ts
app.use(CroutonPlugin(apiUrl, { customComponents }));
```

### 3. Use it from `resource.json`

```json
"layout": {
  "form": {
    "items": [
      {
        "type": "custom",
        "component": "Tabs",
        "items": [
          { "type": "group", "title": "General", "items": ["title", "isbn", "publishedAt"] },
          { "type": "group", "title": "Loans", "items": [{ "component": "LoanList" }] }
        ]
      }
    ]
  }
}
```

Use the same node in `layout.view` for a read-only detail view with tabs.

## Notes

- Keep inactive panels mounted (`v-show`); with `v-if`, fields on hidden tabs skip validation.
- Fields inside the custom node count as placed — they are not appended again at the end of the form.
- Custom nodes are for `layout.form` / `layout.view`; `layout.table` does not support them.
