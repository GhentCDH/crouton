<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { computed } from 'vue';

import { useControlBinding } from '@ghentcdh/crouton-forms-vue';

import { useCrouton } from '../composables/useCrouton';
import { findCustomComponent } from '../utils/custom-component';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { wrapper, value, field, onBlur, onChange, appliedOptions } =
  useControlBinding(props.uischema, props.schema);

const customComponent = computed(() =>
  findCustomComponent(
    useCrouton().customComponents,
    (appliedOptions.value as Record<string, unknown>).customComponent as string,
  ),
);
</script>

<template>
  <component
    v-if="customComponent"
    :is="customComponent"
    v-bind="wrapper"
    v-model="value"
    :applied-options="appliedOptions"
    :schema="schema"
    :uischema="uischema"
    @blur="onBlur"
    @change="onChange"
  />
</template>