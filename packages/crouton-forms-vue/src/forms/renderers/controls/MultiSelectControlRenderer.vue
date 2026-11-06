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

const onChange = (val: unknown) => {
  const opts = appliedOptions.value as Record<string, unknown>;
  const valueKey = (opts['valueKey'] as string | undefined) ?? 'value';
  const stored =
    opts['storeValue'] && Array.isArray(val)
      ? val.map((item): unknown =>
          item && typeof item === 'object' ? (item as Record<string, unknown>)[valueKey] : item,
        )
      : val;
  field.setValue(stored);
  onFieldChange();
};
</script>
