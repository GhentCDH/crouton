<template>
  <ReadonlyLabel v-bind="wrapper">
    <component
      :is="displayWrapper.component"
      v-bind="displayWrapper.value"
    />
  </ReadonlyLabel>
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';

import ReadonlyLabel from './ReadonlyLabel.vue';
import { useReadonlyControlBinding } from '../composables/useReadonlyBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { wrapper, displayWrapper } = useReadonlyControlBinding(
  props.uischema,
  props.schema,
);
</script>
