<template>
  <MultiSelect
    v-bind="wrapper"
    :model-value="parsedValue"
    :options="options"
    :display-options="appliedOptions?.displayValues"
    :clearable="appliedOptions?.clearable ?? true"
    @change="onChange"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { computed } from 'vue';

import { MultiSelect } from '@ghentcdh/crouton-ui-vue';

import { useSelectBinding } from './composables/useSelectBinding';
import { useSelectOptions } from './composables/useSelectOptions';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  wrapper,
  value,
  field,
  onBlur,
  onChange: onFieldChange,
  appliedOptions,
} = useSelectBinding(props.uischema, props.schema);

const { options } = useSelectOptions(appliedOptions);

// An array schema holds a real array; anything else (e.g. a Prisma `String?`
// column, possibly nullable) keeps the list as a JSON string.
const storesJson = computed(() => {
  const type = props.schema.type;
  return !(type === 'array' || (Array.isArray(type) && type.includes('array')));
});

const parsedValue = computed(() => {
  const v = value.value;
  if (!v || typeof v !== 'string') return v as unknown[] | undefined;
  try { return JSON.parse(v) as unknown[]; } catch { return []; }
});

const onChange = (val: unknown) => {
  const valueKey = appliedOptions.value?.valueKey ?? 'value';
  const list = Array.isArray(val) ? val : [];
  const items = appliedOptions.value?.storeValue
    ? list.map((item: unknown) =>
        item && typeof item === 'object' ? (item as Record<string, unknown>)[valueKey] : item,
      )
    : list;
  field.setValue(storesJson.value ? JSON.stringify(items) : items);
  onFieldChange();
};
</script>
