<template>
  <InputNumber
    v-bind="wrapper"
    v-model="value"
    :steps="0.01"
    @blur="onBlur"
    @change="onChange"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';

import { InputNumber } from '@ghentcdh/ui';

import { useControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { wrapper, value, onBlur, onChange } = useControlBinding(
  props.uischema,
  props.schema,
  { defaultType: 'number' },
);
</script>
