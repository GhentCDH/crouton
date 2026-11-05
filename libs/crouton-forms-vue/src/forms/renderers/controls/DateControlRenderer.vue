<template>
  <DatePicker
    v-bind="wrapper"
    :model-value="value"
    :with-time="withTime"
    :min="appliedOptions.min"
    :max="appliedOptions.max"
    :locale="appliedOptions.locale"
    @update:model-value="onUpdate"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { computed } from 'vue';

import DatePicker from './date/DatePicker.vue';
import { resolveWithTime } from './date/useDateModel';
import { useControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { wrapper, value, field, onBlur, onChange, appliedOptions } =
  useControlBinding(props.uischema, props.schema);

const withTime = computed(() =>
  resolveWithTime(
    appliedOptions.value as Record<string, any>,
    props.schema as Record<string, any>,
  ),
);

/**
 * `DatePicker` emits the ISO string (or `undefined` to clear), so set it on the
 * field explicitly instead of using `v-model` — that keeps a cleared date as
 * `null` (persisted as NULL) rather than an empty string. Must be `null` not
 * `undefined`: JSON.stringify drops undefined keys, so the PATCH body would
 * omit the field entirely and the server would never clear the value.
 */
const onUpdate = (next?: string) => {
  field.setValue(next ?? null);
  onChange();
};
</script>
