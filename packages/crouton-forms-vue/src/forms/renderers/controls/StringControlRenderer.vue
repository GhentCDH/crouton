<!-- src/forms/fields/TextControl.vue -->
<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';

import { Input } from '@ghentcdh/ui';

import { useControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { wrapper, value, onBlur, onChange } = useControlBinding(
  props.uischema,
  props.schema,
);
</script>

<template>
  <Input
    v-bind="wrapper"
    v-model="value"
    @blur="onBlur"
    @change="onChange"
  />
</template>
