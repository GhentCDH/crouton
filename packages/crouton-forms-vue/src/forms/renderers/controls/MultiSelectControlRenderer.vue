<template>
  <MultiSelect
    v-bind="wrapper"
    :model-value="value"
    @change="onChange"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';

import { MultiSelect } from '@ghentcdh/ui';

import { useSelectBinding } from './composables/useSelectBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  wrapper,
  value,
  field,
  onBlur,
  onChange: onFieldChange,
  appliedOptions,
} = useSelectBinding(props.uischema, props.schema);

const onChange = (val: any) => {
  const opts = appliedOptions.value as any;
  const valueKey = opts.valueKey ?? 'value';
  const stored = opts.storeValue && Array.isArray(val)
    ? val.map((item: any) => (item && typeof item === 'object' ? item[valueKey] : item))
    : val;
  field.setValue(stored);
  onFieldChange();
};
</script>
