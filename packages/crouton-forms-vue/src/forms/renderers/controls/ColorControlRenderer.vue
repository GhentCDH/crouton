<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';

import type { ControlOptions } from '@ghentcdh/crouton-core';
import { ColorInput } from '@ghentcdh/crouton-ui-vue';

import { useCustomControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { wrapper, value, onBlur, onChange } =
  useCustomControlBinding<ControlOptions<'color'>>()(props.uischema, props.schema);
</script>

<template>
  <ColorInput
    v-bind="wrapper"
    v-model="value"
    @blur="onBlur"
    @change="onChange"
  />
</template>
