<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { computed } from 'vue';

import type { ControlOptions } from '@ghentcdh/crouton-core';
import { Input } from '@ghentcdh/crouton-ui-vue';

import { useCustomControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { wrapper, value, onBlur, onChange } =
  useCustomControlBinding<ControlOptions<'color'>>()(props.uischema, props.schema);

// The native picker only accepts #rrggbb; show black for empty/invalid text.
const pickerValue = computed(() =>
  typeof value.value === 'string' && /^#[0-9a-f]{6}$/i.test(value.value) ? value.value : '#000000',
);

const onPick = (e: Event) => {
  value.value = (e.target as HTMLInputElement).value;
};
</script>

<template>
  <Input
    v-bind="wrapper"
    v-model="value"
    :placeholder="wrapper.placeholder ?? '#rrggbb'"
    @blur="onBlur"
    @change="onChange"
  >
    <template #prefix>
      <input
        type="color"
        class="absolute left-2 top-1/2 z-10 h-6 w-8 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0"
        :value="pickerValue"
        :disabled="wrapper.enabled === false"
        :aria-label="`${wrapper.label ?? ''} picker`.trim()"
        @input="onPick"
        @change="onChange"
      />
    </template>
  </Input>
</template>
