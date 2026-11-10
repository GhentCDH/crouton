<template>
  <Textarea
    v-bind="wrapper"
    v-model="value"
    :dir="dir"
    :height="textareaHeight"
    :min-height="textareaMinHeight"
    @blur="onBlur"
    @change="onChange"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { useFormContext } from 'vee-validate';
import { computed, inject } from 'vue';

import type { ControlOptions } from '@ghentcdh/crouton-core';
import { Textarea } from '@ghentcdh/crouton-ui-vue';

import { useCustomControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { wrapper, value, onBlur, onChange, appliedOptions } =
  useCustomControlBinding<ControlOptions<'textarea'>>()(props.uischema, props.schema);

const pathPrefix = inject<string>('pathPrefix', '');
const textareaHeight = computed(() => appliedOptions.value?.height);
const textareaMinHeight = computed(() => appliedOptions.value?.minHeight);

// Read the direction value from the form's reactive values proxy directly.
// This avoids registering a phantom field (useField side effect) and avoids
// deep-watching the entire form (which causes infinite update loops).
const { values: formValues } = useFormContext();

const dir = computed<'ltr' | 'rtl'>(() => {
  const directionField = appliedOptions.value?.directionField;
  if (!directionField) return appliedOptions.value?.direction ?? 'ltr';
  const key = pathPrefix
    ? `${pathPrefix}.${directionField}`
    : directionField;
  const val = key.split('.').reduce<unknown>((o, k) => {
    if (o && typeof o === 'object') return (o as Record<string, unknown>)[k];
    return undefined;
  }, formValues);
  return (val as 'ltr' | 'rtl') ?? 'ltr';
});
</script>
