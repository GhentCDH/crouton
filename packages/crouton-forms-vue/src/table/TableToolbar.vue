<template>
  <div class="navbar bg-base-100">
    <div class="navbar-start">
      <div v-if="$slots.left">
        <slot name="left" />
      </div>
    </div>
    <div class="navbar-center flex gap-2 items-center">
      <Input
        placeholder="Search..."
        :value="searchQuery"
        size="sm"
        width="w-48"
        :clearable="true"
        @input="onSearchInput(($event.target as HTMLInputElement).value)"
      />

      <TableFilter
        v-if="filterSchema"
        :filters="filters ?? []"
        :filter-schema="filterSchema"
        @change-filters="onChangeFilters"
      />

      <div
        v-if="actions"
        class="flex gap-2"
      >
        <Btn
          v-for="action in actions"
          :key="action.label ?? action.tooltip"
          size="xs"
          color="ghost"
          class="border-gray-300 text-base-content/50 h-8"
          :icon="action.icon"
          :tooltip="action.tooltip"
          @click="action.action"
        >
          <span v-if="action.label">{{ action.label }}</span>
        </Btn>
      </div>
    </div>
    <div class="navbar-end">
      <div v-if="$slots.right">
        <slot name="right" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { Btn, Input } from '@ghentcdh/ui';

import TableFilter from './filter/TableFilter.vue';

type Action = any;
const props = defineProps<{
  /** JSON Schema for filterable columns — keys are field ids, titles are labels. */
  filterSchema?: Record<string, any>;
  /** Active filter strings in wire format, e.g. ["title:foo:contains"]. */
  filters?: string[];
  /** Current search query (the `q` lookup param). */
  search?: string;
  actions?: Action[];
}>();

const emit = defineEmits<{
  updateSearch: [q: string];
  updateFilters: [filters: string[]];
  action: [action: Action];
}>();

const searchQuery = ref(props.search ?? '');

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const onSearchInput = (value: string) => {
  searchQuery.value = value;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => emit('updateSearch', value), 300);
};

const onChangeFilters = (filters: string[]) => {
  emit('updateFilters', filters);
};
</script>
