<template>
  <Markdown
    v-bind="wrapper"
    :model-value="value"
    :min-height="appliedOptions.minHeight"
    @change="onChange"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';

import type { ControlOptions } from '@ghentcdh/crouton-core';
import { Markdown } from '@ghentcdh/crouton-ui-vue';

import { useCustomControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  wrapper,
  value,
  field,
  onBlur,
  onChange: onFieldChange,
  appliedOptions,
} = useCustomControlBinding<ControlOptions<'markdown'>>()(props.uischema, props.schema);

const onChange = (val: string) => {
  field.setValue(val);
  onFieldChange();
};
</script>
