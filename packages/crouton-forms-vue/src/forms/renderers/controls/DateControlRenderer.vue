<template>
  <DatePicker
    v-bind="wrapper"
    :model-value="(value as string | null | undefined)"
    :with-time="withTime"
    :min="appliedOptions.min"
    :max="appliedOptions.max"
    :locale="appliedOptions.locale"
    :first-day-of-week="appliedOptions.firstDayOfWeek"
    @update:model-value="onUpdate"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { computed } from 'vue';

import type { ControlOptions } from '@ghentcdh/crouton-core';

import DatePicker from './date/DatePicker.vue';
import { resolveWithTime } from './date/useDateModel';
import { useCustomControlBinding } from './composables/useControlBinding';

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { wrapper, value, field, onBlur, onChange, appliedOptions, emptyValue } =
  useCustomControlBinding<ControlOptions<'date'>>()(props.uischema, props.schema);

const withTime = computed(() =>
  resolveWithTime(
    appliedOptions.value as Record<string, unknown>,
    props.schema as Record<string, unknown>,
  ),
);

/**
 * `DatePicker` emits the ISO string (or `undefined` to clear), so set it on the
 * field explicitly instead of using `v-model`. A cleared date stores the form's
 * empty value: `null` in API-backed forms (an `undefined` key would be dropped
 * from the autosave PATCH and never cleared on the server), else `undefined`.
 */
const onUpdate = (next?: string) => {
  field.setValue(next ?? emptyValue());
  onChange();
};
</script>
