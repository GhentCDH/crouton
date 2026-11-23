<template>
  <Input
    v-bind="properties"
    v-model="model"
    @change="emit('change', $event)"
    @focus="emit('focus', $event)"
    @blur="emit('blur', $event)"
    @clear="emit('clear')"
  >
    <template #prefix>
      <input
        type="color"
        class="absolute left-2 top-1/2 z-10 h-6 w-8 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0"
        :value="pickerValue"
        :disabled="!enabled"
        :aria-label="`${label ?? ''} picker`.trim()"
        @input="onPick"
        @change="emit('change', $event)"
      />
    </template>
  </Input>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { ColorInputEmits, ColorInputProperties } from './ColorInput.properties';
import Input from './Input.vue';

const properties = defineProps(ColorInputProperties);
const emit = defineEmits(ColorInputEmits);
const model = defineModel();

// The native picker only accepts #rrggbb; show black for empty/invalid text.
const pickerValue = computed(() =>
  typeof model.value === 'string' && /^#[0-9a-f]{6}$/i.test(model.value) ? model.value : '#000000',
);

const onPick = (e: Event) => {
  model.value = (e.target as HTMLInputElement).value;
};
</script>
