<template>
  <ControlLabel v-bind="wrapper">
    <div class="flex items-end gap-2">
      <label class="flex flex-col gap-1">
        <small class="text-gray-500">{{ fromLabel }}</small>
        <input
          v-if="yearOnly"
          type="number"
          step="1"
          class="input w-24"
          autocomplete="off"
          :value="value?.[fromField] ?? ''"
          :max="value?.[toField] || undefined"
          @input="update(fromField, ($event.target as HTMLInputElement).value)"
          @blur="onBlur"
        />
        <input
          v-else
          type="date"
          class="input w-36"
          autocomplete="off"
          data-lpignore="true"
          data-bwignore="true"
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
          v-if="yearOnly"
          type="number"
          step="1"
          class="input w-24"
          autocomplete="off"
          :value="value?.[toField] ?? ''"
          :min="value?.[fromField] || undefined"
          @input="update(toField, ($event.target as HTMLInputElement).value)"
          @blur="onBlur"
        />
        <input
          v-else
          type="date"
          class="input w-36"
          autocomplete="off"
          data-lpignore="true"
          data-bwignore="true"
          :value="value?.[toField] ?? ''"
          :min="value?.[fromField] || undefined"
          @input="update(toField, ($event.target as HTMLInputElement).value)"
          @blur="onBlur"
        />
      </label>
    </div>
  </ControlLabel>
</template>

<script setup lang="ts">
import type { ControlElement, JsonSchema } from '@jsonforms/core';
import { useCustomControlBinding } from './composables/useControlBinding';
import { computed } from 'vue';
import ControlLabel from './ControlLabel.vue';

type DateRange = Record<string, string | undefined>;

const props = defineProps<{ uischema: ControlElement; schema: JsonSchema }>();

// Binds to a single property whose value is stored as a JSON string in the DB.
const { value: rawValue, wrapper, onBlur, onChange, appliedOptions } =
  useCustomControlBinding()(props.uischema, props.schema);

// Parse the JSON string from the DB into a DateRange object for the template.
const value = computed<DateRange | undefined>(() => {
  const v = rawValue.value;
  if (!v) return undefined;
  if (typeof v === 'object') return v as DateRange;
  try { return JSON.parse(v as string) as DateRange; } catch { return undefined; }
});

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

const yearOnly = computed<boolean>(
  // appliedOptions is typed as ControlOption | { [key: string]: any } from jsonforms;
  // custom options not in ControlOption need a cast to access without TS2339.
  () => !!((appliedOptions.value as Record<string, unknown>)?.yearOnly),
);

function update(key: string, v: string) {
  const next: DateRange = { ...(value.value ?? {}) };
  if (v) next[key] = v;
  else delete next[key];
  // collapse to undefined when both ends are empty so it persists as NULL
  const result = next[fromField.value] || next[toField.value] ? next : undefined;
  // Store as JSON string — Prisma column is String?, not a JSON column. Use null (not undefined) when empty so schema string | null validates.
  rawValue.value = result !== undefined ? JSON.stringify(result) : null;
  onChange();
}
</script>
