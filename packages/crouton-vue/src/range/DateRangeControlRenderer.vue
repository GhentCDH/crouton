<template>
  <ControlWrapper v-bind="wrapper">
    <div class="flex items-center gap-2">
      <input
        type="date"
        class="input"
        :value="value?.from ?? ''"
        :max="value?.to || undefined"
        @input="update('from', ($event.target as HTMLInputElement).value)"
        @blur="onBlur"
      />
      <span class="text-secondary">→</span>
      <input
        type="date"
        class="input"
        :value="value?.to ?? ''"
        :min="value?.from || undefined"
        @input="update('to', ($event.target as HTMLInputElement).value)"
        @blur="onBlur"
      />
    </div>
  </ControlWrapper>
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { ControlWrapper } from '@ghentcdh/ui';
import { useCustomControlBinding } from '@ghentcdh/json-forms-vue';

type DateRange = { from?: string; to?: string };

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

// Binds to a single property whose value is the object { from, to }.
const { value, wrapper, onBlur } = useCustomControlBinding()(
  props.uischema,
  props.schema,
);

function update(key: 'from' | 'to', v: string) {
  const next: DateRange = { ...(value.value ?? {}) };
  if (v) next[key] = v;
  else delete next[key];
  // collapse to undefined when both ends are empty so it persists as NULL
  value.value = next.from || next.to ? next : undefined;
}
</script>
