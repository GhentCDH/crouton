---
description: Build a custom layout component (stepper as example), register it in customComponents, and use it from layout.form / layout.view.
---

# Custom layout (stepper)

Use this when the built-in layout nodes (`grid`, `vertical`, `horizontal`, `collapse`, `group`, `tabs`) are not
enough — for example a stepper, or side-by-side panes. The example below builds a stepper.

::: tip Tabs are built in
For tabs, use [`"type": "tabs"`](../2.resources/layout.md#tabs) — no custom component needed; see the
[tabs layout recipe](./tabs-layout.md). To restyle them,
register your own component under the name `Tabs`; it replaces the built-in one and receives the same props as below.
:::

## Steps

### 1. Create the layout component

The component receives `elements` — one built UI-schema element per entry in the node's `items` — and renders each
with `Dispatch`.

```vue
<!-- src/components/StepperLayout.vue -->
<script setup lang="ts">
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { Dispatch } from '@ghentcdh/crouton-forms-vue';
import { type PropType, ref } from 'vue';

defineProps({
  elements: { type: Array as PropType<UISchemaElement[]>, required: true },
  schema: { type: Object as PropType<JsonSchema>, required: true },
});

const step = ref(0);
const titleOf = (el: UISchemaElement, i: number) =>
  (el.options?.title as string | undefined) ?? `Step ${i + 1}`;
</script>

<template>
  <ul class="steps w-full">
    <li v-for="(el, i) in elements" :key="i" :class="['step', { 'step-primary': i <= step }]">
      {{ titleOf(el, i) }}
    </li>
  </ul>
  <!-- v-show, not v-if: hidden steps stay mounted so their fields keep validating -->
  <div v-for="(el, i) in elements" v-show="step === i" :key="i" class="pt-4">
    <Dispatch :uischema="el" :schema="schema" />
  </div>
  <div class="flex justify-between pt-4">
    <button type="button" class="btn" :disabled="step === 0" @click="step--">Previous</button>
    <button type="button" class="btn" :disabled="step === elements.length - 1" @click="step++">Next</button>
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
import StepperLayout from './components/StepperLayout.vue';

export const customComponents: CustomComponentEntry[] = [
  { tester: customComponentIs('Stepper', 10), renderer: markRaw(StepperLayout) },
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
        "component": "Stepper",
        "items": [
          { "type": "group", "title": "Basics", "items": ["title", "isbn"] },
          { "type": "group", "title": "Publication", "items": ["publisher", "publishedAt"] }
        ]
      }
    ]
  }
}
```

Use the same node in `layout.view` for a read-only detail view.

## Notes

- Keep inactive panels mounted (`v-show`); with `v-if`, fields on hidden steps skip validation.
- All steps are one form with a single Save — the stepper only changes what is visible.
- Fields inside the custom node count as placed — they are not appended again at the end of the form.
- Custom nodes are for `layout.form` / `layout.view`; `layout.table` does not support them.
