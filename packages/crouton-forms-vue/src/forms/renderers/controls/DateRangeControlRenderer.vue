<template>
  <ControlWrapper v-bind="wrapper">
    <div class="flex items-end gap-2">
      <label class="flex flex-col gap-1">
        <small class="text-gray-500">{{ fromLabel }}</small>
        <input
          :type="yearOnly ? 'text' : 'date'"
          :class="[inputClass, yearOnly ? 'w-28' : 'w-36']"
          autocomplete="off"
          data-lpignore="true"
          data-bwignore="true"
          :placeholder="yearOnly ? yearPlaceholder : undefined"
          :value="value?.[fromField] ?? ''"
          :max="yearOnly ? undefined : value?.[toField] || undefined"
          :disabled="!enabled"
          :aria-invalid="!!wrapper.errors"
          @input="update(fromField, ($event.target as HTMLInputElement).value)"
          @blur="onBlur"
        />
      </label>
      <span class="text-secondary pb-2" aria-hidden="true">→</span>
      <label class="flex flex-col gap-1">
        <small class="text-gray-500">{{ toLabel }}</small>
        <input
          :type="yearOnly ? 'text' : 'date'"
          :class="[inputClass, yearOnly ? 'w-28' : 'w-36']"
          autocomplete="off"
          data-lpignore="true"
          data-bwignore="true"
          :placeholder="yearOnly ? yearPlaceholder : undefined"
          :value="value?.[toField] ?? ''"
          :min="yearOnly ? undefined : value?.[fromField] || undefined"
          :disabled="!enabled"
          :aria-invalid="!!wrapper.errors"
          @input="update(toField, ($event.target as HTMLInputElement).value)"
          @blur="onBlur"
        />
      </label>
    </div>
  </ControlWrapper>
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { computed } from 'vue';

import type { ControlOptions } from '@ghentcdh/crouton-core';
import { ControlWrapper } from '@ghentcdh/crouton-ui-vue';

import { useCustomControlBinding } from './composables/useControlBinding';

type DateRange = Record<string, string | undefined>;

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

const { value: rawValue, wrapper, onBlur, onChange, appliedOptions, emptyValue } =
  useCustomControlBinding<ControlOptions<'dateRange'>>()(props.uischema, props.schema);

// An object schema holds the range as an object; anything else (e.g. a Prisma
// `String?` column) keeps it as a JSON string.
const storesJson = computed(() => {
  const type = props.schema.type;
  return !(type === 'object' || (Array.isArray(type) && type.includes('object')));
});

const value = computed<DateRange | undefined>(() => {
  const v = rawValue.value;
  if (!v) return undefined;
  if (typeof v === 'object') return v as DateRange;
  try {
    return JSON.parse(v as string) as DateRange;
  } catch {
    return undefined;
  }
});

const enabled = computed(() => (wrapper.value as { enabled?: boolean }).enabled !== false);
const inputClass = computed(
  () => (wrapper.value as { styles?: { control?: { input?: string } } }).styles?.control?.input ?? 'input',
);

const fromLabel = computed(() => appliedOptions.value?.fromLabel ?? 'From');
const toLabel = computed(() => appliedOptions.value?.toLabel ?? 'To');
const fromField = computed(() => appliedOptions.value?.fromField ?? 'from');
const toField = computed(() => appliedOptions.value?.toField ?? 'to');
const yearOnly = computed(() => !!appliedOptions.value?.yearOnly);
const yearPlaceholder = computed(
  () => (wrapper.value as { placeholder?: string }).placeholder ?? 'e.g. 450 CE',
);

const update = (key: string, v: string) => {
  const next: DateRange = { ...(value.value ?? {}) };
  if (v) next[key] = v;
  else delete next[key];
  const hasValue = !!(next[fromField.value] || next[toField.value]);
  // Both ends empty → the form's empty value (null in API forms, so it persists as NULL).
  if (!hasValue) rawValue.value = emptyValue();
  else rawValue.value = storesJson.value ? JSON.stringify(next) : next;
  onChange();
};
</script>
