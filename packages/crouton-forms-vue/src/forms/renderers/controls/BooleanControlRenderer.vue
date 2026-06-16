<template>
  <Checkbox
    v-bind="wrapper"
    :model-value="value"
    @change="onChange"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';

import { Checkbox } from '@ghentcdh/ui';

import { useCustomControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const useBooleanBinding = useCustomControlBinding({
  setDefaultValue: (field) => {
    if (field.value.value === undefined) field.setValue(false);
  },
});

const { wrapper, value, field, onBlur, onChange: onFieldChange } =
  useBooleanBinding(props.uischema, props.schema);

const onChange = (val: boolean) => {
  field.setValue(Boolean(val) ?? false);
  onFieldChange();
};
</script>
