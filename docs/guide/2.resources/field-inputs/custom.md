# Custom field renderer

Register a Vue component as a custom form field renderer. Uses the [JsonForms](https://jsonforms.io/) renderer registry under the hood.

## 1. Create the component

The component uses a standard v-model interface: receive `modelValue`, emit `update:modelValue`. Define props in a
sibling `.properties.ts` file:

```ts
// RatingInput.properties.ts
import type { PropType } from 'vue';

export const RatingInputProperties = {
  modelValue: { type: Number as PropType<number | null>, default: null },
};
```

```vue
<!-- RatingInput.vue -->
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

## 2. Register the renderer

Pass a `customComponents` array to `CroutonPlugin`. Use `customComponentIs` to create the tester:

```ts
// src/custom-components.ts
import { customComponentIs, type CustomComponentEntry } from '@ghentcdh/crouton-vue';
import { markRaw } from 'vue';
import RatingInput from './RatingInput.vue';

export const customComponents: CustomComponentEntry[] = [
  {
    tester: customComponentIs('rating', 10),
    renderer: markRaw(RatingInput),
  },
];
```

```ts
// main.ts
import { CroutonPlugin } from '@ghentcdh/crouton-vue';
import { customComponents } from './custom-components';

app.use(CroutonPlugin(api, { router, customComponents }));
```

The second argument to `customComponentIs` is the priority. Higher wins when multiple renderers match.

## 3. Wire it in resource.json

Set `fieldInput.options.customComponent` to the name you passed to `customComponentIs`:

```jsonc
"rating": {
  "fieldInput": {
    "type": "custom",
    "options": {
      "customComponent": "rating"
    }
  }
}
```

<!-- @include: ./_generated/custom.md -->
