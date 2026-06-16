<template>
  <Textarea
    v-bind="wrapper"
    v-model="value"
    :dir="dir"
    :height="(appliedOptions as any).height"
    :min-height="(appliedOptions as any).minHeight"
    @blur="onBlur"
    @change="onChange"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { useFormContext } from 'vee-validate';
import { computed, inject } from 'vue';

import { Textarea } from '@ghentcdh/ui';

import { useControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { wrapper, value, onBlur, onChange, appliedOptions } = useControlBinding(
  props.uischema,
  props.schema,
);

const pathPrefix = inject<string>('pathPrefix', '');
const opts = (props.uischema.options ?? {}) as any;

// Read the direction value from the form's reactive values proxy directly.
// This avoids registering a phantom field (useField side effect) and avoids
// deep-watching the entire form (which causes infinite update loops).
const { values: formValues } = useFormContext();

const dir = computed<'ltr' | 'rtl'>(() => {
  if (!opts.directionField) return (opts.direction as 'ltr' | 'rtl') ?? 'ltr';
  const key = pathPrefix ? `${pathPrefix}.${opts.directionField}` : opts.directionField;
  const val = key.split('.').reduce((o: any, k: string) => o?.[k], formValues);
  return (val as 'ltr' | 'rtl') ?? 'ltr';
});
</script>
