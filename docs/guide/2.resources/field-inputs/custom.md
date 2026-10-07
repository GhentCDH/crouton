# Custom field renderer

Register a Vue component as a custom form field renderer. Uses the [JsonForms](https://jsonforms.io/) renderer registry under the hood.

## 1. Create the component

The component receives `uischema` and `schema` props from JsonForms. Use `useControlBinding` to read and write the field value:

```vue
<!-- RatingInput.vue -->
<template>
  <div class="flex gap-1">
    <button
      v-for="star in 5"
      :key="star"
      type="button"
      @click="value = star"
      :class="star <= value ? 'text-yellow-400' : 'text-gray-300'"
    >
      ★
    </button>
  </div>
</template>

<script lang="ts" setup>
import { type ControlElement, type JsonSchema, useControlBinding } from '@ghentcdh/crouton-forms-vue';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();
const { value } = useControlBinding(props.uischema, props.schema);
// value.value is the current field value; assign to update it
</script>
```

`useControlBinding` also exposes `formValues` (all fields on the form, reactive) when you need to read sibling fields.

## 2. Register the renderer

Pass a `renderers` array to `CroutonPlugin`. Use `rankWith` + `isCustomControlRender` from the respective packages:

```ts
// src/renderers.ts
import { rankWith } from '@jsonforms/core';
import { isCustomControlRender } from '@ghentcdh/crouton-forms-vue';
import { markRaw } from 'vue';
import RatingInput from './RatingInput.vue';

export const customRenderers = [
  {
    tester: rankWith(10, isCustomControlRender('rating')),
    renderer: markRaw(RatingInput),
  },
];
```

```ts
// main.ts
import { CroutonPlugin } from '@ghentcdh/crouton-vue';
import { customRenderers } from './renderers';

app.use(CroutonPlugin(api, { router, renderers: customRenderers }));
```

The second argument to `rankWith` is the priority. Higher wins when multiple renderers match. Built-in crouton renderers use ranks 1–15; use 10+ for custom ones.

## 3. Wire it in resource.json

Set `fieldInput.options.customRender` to the name you passed to `isCustomControlRender`:

```jsonc
"fieldInput": {
  "type": "custom",
  "options": {
    "customRender": "rating"
  }
}
```

<!-- @include: ./_generated/custom.md -->
