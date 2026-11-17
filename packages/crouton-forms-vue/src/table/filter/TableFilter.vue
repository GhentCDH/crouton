<template>
  <div ref="containerRef" class="relative inline-flex">
    <Btn
      size="xs"
      color="ghost"
      class="border-gray-300 text-base-content/50 h-8 "
      :popovertarget="panelId"
    >
      <span class="px-2 flex gap-2 items-center">
        <Icon :icon="IconEnum.Filter" size="sm" class="text-base-500" />
        {{ t('table.filters', 'Filters') }}
        <span
          v-if="appliedCount"
          class="badge badge-sm bg-base-300 text-base-700"
        >
          {{ appliedCount }}
        </span>
      </span>
    </Btn>

    <!-- popover="auto" opened by the button above: the browser handles light
         dismiss and Esc, and the button is the panel's implicit anchor. -->
    <div
      :id="panelId"
      ref="panelRef"
      popover
      data-testid="filter-panel"
      class="min-w-[560px] overflow-visible border border-base-200 rounded-xl bg-base-100 text-base-content shadow-lg p-4"
      :style="panelStyle"
      @beforetoggle="onBeforeToggle"
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
        <Btn :icon="IconEnum.Plus" :color="'ghost'" @click="addRow">
          {{ t('table.addFilter', 'Add filter') }}
        </Btn>

        <div class="flex gap-2">
          <Btn :color="'ghost'" @click="onReset">{{ t('actions.reset', 'Reset') }}</Btn>
          <Btn @click="onApply">{{ t('actions.apply', 'Apply') }}</Btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';

import type { FieldType, Filter } from '@ghentcdh/crouton-core';
import { useUiTranslator } from '../../composables/useUiTranslator';
import {
  extractFilters,
  filterToString,
  OperatorNoValue,
} from '@ghentcdh/crouton-core';
import {
  anchoredStyle,
  Btn,
  fixedStyleBelow,
  Icon,
  IconEnum,
  supportsAnchorPositioning,
} from '@ghentcdh/crouton-ui-vue';

import type { FieldOption } from './field-option';
import FilterRowInput from './FilterRowInput.vue';

const t = useUiTranslator();
const appliedCount = ref(0);
const panelId = `table-filter-${useId()}`;
const containerRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const panelStyle = ref<Record<string, string>>({});

// Right-align the panel under the button (it is wider than the button and
// sits near the right edge). Runs before the popover is painted.
const onBeforeToggle = (event: Event) => {
  if ((event as ToggleEvent).newState !== 'open' || !containerRef.value) return;
  panelStyle.value = supportsAnchorPositioning()
    ? anchoredStyle('end')
    : fixedStyleBelow(containerRef.value, 'end');
};

const closePanel = () => panelRef.value?.hidePopover();

const props = defineProps<{
  /** Active filter strings from the URL, e.g. ["title:foo:contains"] */
  filters: string[];
  /** JSON Schema for filterable columns — keys are field ids, titles are labels */
  filterSchema?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  changeFilters: [filters: string[]];
  close: [];
}>();

/** Map an x-field-type hint (or JSON schema type/format) to a FieldType. */
const resolveFieldType = (schema: Record<string, unknown>): FieldType => {
  const hint = schema['x-field-type'];
  if (
    hint === 'enum' ||
    hint === 'number' ||
    hint === 'date' ||
    hint === 'boolean'
  )
    return hint;
  if (schema['type'] === 'number' || schema['type'] === 'integer') return 'number';
  if (schema['format'] === 'date-time' || schema['format'] === 'date') return 'date';
  if (schema['type'] === 'boolean') return 'boolean';
  return 'string';
};

/** Field options derived from the filterSchema properties */
const fields = computed<FieldOption[]>(() => {
  const properties = props.filterSchema?.['properties'] as
    Record<string, Record<string, unknown>> | undefined;
  if (!properties) return [];
  return Object.entries(properties).map(([key, schema]) => ({
    value: key,
    label: (schema['title'] as string | undefined) ?? key,
    type: resolveFieldType(schema),
    values: schema['x-values'] as FieldOption['values'],
  }));
});

const defaultField = computed<string>(() => {
  const first = fields.value[0] as { value: string } | undefined;
  return first?.value ?? '';
});

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
  closePanel();
};

const onReset = () => {
  rows.value = [emptyRow()];
  appliedCount.value = 0;
  emit('changeFilters', []);
  closePanel();
};
</script>
