<template>
  <InputNumber
    v-bind="wrapper"
    v-model="model"
    :steps="isInteger ? 1 : 0.01"
    @blur="onBlur"
    @change="onChange"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { computed } from 'vue';

import { InputNumber } from '@ghentcdh/crouton-ui-vue';

import { useControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { wrapper, value, onBlur, onChange, emptyValue } = useControlBinding(
  props.uischema,
  props.schema,
  { defaultType: 'number' },
);

const isInteger = computed(() => props.schema.type === 'integer');

// An emptied <input type="number"> yields '' — store "no value" instead, so a
// required field reports "required" and an optional one stays valid.
const model = computed({
  get: () => value.value,
  set: (v: unknown) => {
    value.value = v === '' ? emptyValue() : v;
  },
});
</script>
