<template>
  <ControlWrapper v-bind="wrapper">
    <div class="flex items-end gap-2">
      <label class="flex flex-col gap-1">
        <small class="text-gray-500">{{ fromLabel }}</small>
        <input
          type="date"
          class="input"
          :value="value?.[fromField] ?? ''"
          :max="value?.[toField] || undefined"
          @input="update(fromField, ($event.target as HTMLInputElement).value)"
          @blur="onBlur"
        />
      </label>
      <span class="text-secondary pb-2">→</span>
      <label class="flex flex-col gap-1">
        <small class="text-gray-500">{{ toLabel }}</small>
        <input
          type="date"
          class="input"
          :value="value?.[toField] ?? ''"
          :min="value?.[fromField] || undefined"
          @input="update(toField, ($event.target as HTMLInputElement).value)"
          @blur="onBlur"
        />
      </label>
    </div>
  </ControlWrapper>
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { ControlWrapper } from '@ghentcdh/ui';
import { useCustomControlBinding } from './composables/useControlBinding';
import { computed } from 'vue';

type DateRange = Record<string, string | undefined>;

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

// Binds to a single property whose value is the object keyed by fromField/toField.
const { value, wrapper, onBlur, appliedOptions } = useCustomControlBinding()(
  props.uischema,
  props.schema,
);

const fromLabel = computed<string>(
  () => (appliedOptions.value?.fromLabel as string) ?? 'From',
);
const toLabel = computed<string>(
  () => (appliedOptions.value?.toLabel as string) ?? 'To',
);

// JSON object keys used for the two bounds. Default to 'from' / 'to'.
const fromField = computed<string>(
  () => (appliedOptions.value?.fromField as string) ?? 'from',
);
const toField = computed<string>(
  () => (appliedOptions.value?.toField as string) ?? 'to',
);

function update(key: string, v: string) {
  const next: DateRange = { ...(value.value ?? {}) };
  if (v) next[key] = v;
  else delete next[key];
  // collapse to undefined when both ends are empty so it persists as NULL
  value.value = next[fromField.value] || next[toField.value] ? next : undefined;
}
</script>
