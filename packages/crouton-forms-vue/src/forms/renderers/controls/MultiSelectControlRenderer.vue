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

import { MultiSelect } from '@ghentcdh/crouton-ui-vue';

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

type MultiSelectOpts = { valueKey?: string; storeValue?: boolean };

const onChange = (val: unknown) => {
  const opts = appliedOptions.value as MultiSelectOpts;
  const valueKey = opts.valueKey ?? 'value';
  const stored =
    opts.storeValue && Array.isArray(val)
      ? val.map((item: unknown) =>
          item && typeof item === 'object' ? (item as Record<string, unknown>)[valueKey] : item,
        )
      : val;
  field.setValue(stored);
  onFieldChange();
};
</script>
