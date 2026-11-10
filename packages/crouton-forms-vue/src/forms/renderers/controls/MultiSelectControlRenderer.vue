<template>
  <MultiSelect
    v-bind="wrapper"
    :model-value="parsedValue"
    :options="(appliedOptions.options ?? []) as unknown[]"
    @change="onChange"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { computed } from 'vue';

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

// DB stores array as JSON string; parse for display.
const parsedValue = computed(() => {
  const v = value.value;
  if (!v || typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return []; }
});

const onChange = (val: unknown) => {
  const valueKey = appliedOptions.value?.valueKey ?? 'value';
  const rawArray =
    appliedOptions.value?.storeValue && Array.isArray(val)
      ? val.map((item: unknown) =>
          item && typeof item === 'object' ? (item as Record<string, unknown>)[valueKey] : item,
        )
      : val;
  // Stringify back to JSON string — Prisma column is String?, not a JSON column.
  field.setValue(Array.isArray(rawArray) ? JSON.stringify(rawArray) : rawArray);
  onFieldChange();
};
</script>
