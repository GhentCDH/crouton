<template>
  <SelectComponent
    v-bind="wrapper"
    :model-value="value"
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

import { SelectComponent } from '@ghentcdh/crouton-ui-vue';

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
const valueKey = computed(() => appliedOptions.value?.valueKey ?? 'value');

const onChange = (val: unknown) => {
  const stored =
    appliedOptions.value?.storeValue && val && typeof val === 'object'
      ? (val as Record<string, unknown>)[valueKey.value]
      : val;
  field.setValue(stored);
  onFieldChange();
};
</script>
