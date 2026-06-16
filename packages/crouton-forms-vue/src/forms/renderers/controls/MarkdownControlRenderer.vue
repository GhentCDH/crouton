<template>
  <Markdown
    v-bind="wrapper"
    :model-value="value"
    @change="onChange"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';

import { Markdown } from '@ghentcdh/ui';

import { useControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const {
  wrapper,
  value,
  field,
  onBlur,
  onChange: onFieldChange,
} = useControlBinding(props.uischema, props.schema);

const onChange = (val: string) => {
  field.setValue(val);
  onFieldChange();
};
</script>
