<template>
  <div
    ref="containerRef"
    class="relative inline-flex"
  >
    <Btn
      size="xs"
      color="ghost"
      class="border-gray-300 text-base-content/50 h-8"
      @click="showFilters = !showFilters"
    >
      <span class="px-2 flex gap-2 items-center">
        <Icon
          :icon="IconEnum.Filter"
          size="sm"
          class="text-base-500"
        />
        Filters
        <span
          v-if="appliedCount"
          class="badge badge-sm bg-base-300 text-base-700"
        >
          {{ appliedCount }}
        </span>
      </span>
    </Btn>

    <div
      v-if="showFilters"
      class="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 min-w-[560px] border border-base-200 rounded-xl bg-base-100 shadow-lg p-4"
    >
      <div class="flex flex-col gap-2">
        <FilterRowInput
          v-for="(_row, index) in rows"
          :key="index"
          v-model="rows[index]"
          :fields="fields"
          @remove="removeRow(index)"
        />
      </div>

      <div class="divider my-3" />

      <div class="flex items-center justify-between">
        <Btn
          :icon="IconEnum.Plus"
          :color="'ghost'"
          @click="addRow"
        >
          Add filter
        </Btn>

        <div class="flex gap-2">
          <Btn
            :color="'ghost'"
            @click="onReset"
          >
            Reset
          </Btn>
          <Btn @click="onApply">
            Apply
          </Btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { FieldType, Filter } from '@ghentcdh/crouton-core';
import { extractFilters, filterToString, OperatorNoValue } from '@ghentcdh/crouton-core';
import { Btn, Icon, IconEnum } from '@ghentcdh/ui';

import FilterRowInput, { type FieldOption } from './FilterRowInput.vue';

const showFilters = ref(false);
const appliedCount = ref(0);
const containerRef = ref<HTMLElement | null>(null);

const onClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;
  // Ignore clicks inside the filter container itself
  if (containerRef.value?.contains(target)) return;
  // Ignore clicks inside a teleported select listbox (rendered outside container in <body>)
  if ((target as Element).closest?.('[data-select-listbox]')) return;
  showFilters.value = false;
};

onMounted(() => document.addEventListener('mousedown', onClickOutside));
onBeforeUnmount(() =>
  document.removeEventListener('mousedown', onClickOutside),
);
const props = defineProps<{
  /** Active filter strings from the URL, e.g. ["title:foo:contains"] */
  filters: string[];
  /** JSON Schema for filterable columns — keys are field ids, titles are labels */
  filterSchema?: Record<string, any>;
}>();

const emit = defineEmits<{
  changeFilters: [filters: string[]];
  close: [];
}>();

/** Map an x-field-type hint (or JSON schema type/format) to a FieldType. */
const resolveFieldType = (schema: Record<string, any>): FieldType => {
  const hint = schema['x-field-type'];
  if (hint === 'enum' || hint === 'number' || hint === 'date' || hint === 'boolean') return hint;
  if (schema.type === 'number' || schema.type === 'integer') return 'number';
  if (schema.format === 'date-time' || schema.format === 'date') return 'date';
  if (schema.type === 'boolean') return 'boolean';
  return 'string';
};

/** Field options derived from the filterSchema properties */
const fields = computed<FieldOption[]>(() => {
  const properties = props.filterSchema?.properties as
    | Record<string, any>
    | undefined;
  if (!properties) return [];
  return Object.entries(properties).map(([key, schema]) => ({
    value: key,
    label: (schema as any).title ?? key,
    type: resolveFieldType(schema as Record<string, any>),
    values: (schema as any)['x-values'],
  }));
});

const defaultField = computed(() => fields.value[0]?.value ?? '');

const rows = ref<Filter[]>([]);

// Sync rows when the active filters change from outside (URL navigation)
const emptyRow = (): Filter => ({
  key: defaultField.value,
  value: '',
  operator: 'contains',
});

watch(
  () => props.filters,
  (newFilters) => {
    const parsed = extractFilters(newFilters ?? []);
    rows.value = parsed.length > 0 ? parsed : [emptyRow()];
    appliedCount.value = parsed.length;
  },
  { immediate: true },
);

const addRow = () => {
  rows.value = [
    ...rows.value,
    { key: defaultField.value, value: '', operator: 'contains' },
  ];
};

const removeRow = (index: number) => {
  const updated = rows.value.filter((_, i) => i !== index);
  rows.value = updated.length > 0 ? updated : [emptyRow()];
};

const onApply = () => {
  const serialized = rows.value
    .filter((r) => r.key && (r.value || OperatorNoValue.has(r.operator)))
    .map(filterToString);
  appliedCount.value = serialized.length;
  emit('changeFilters', serialized);
  showFilters.value = false;
};

const onReset = () => {
  rows.value = [emptyRow()];
  appliedCount.value = 0;
  emit('changeFilters', []);
  showFilters.value = false;
};
</script>
