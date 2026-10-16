<script setup lang="ts">
import { computed, ref } from 'vue';
import { Btn, Table, TextCell, type TableSort } from '@ghentcdh/crouton-ui-vue';
import { LARGE_TABLE, SMALL_TABLE } from './sample-data';

type Variant = 'simple' | 'large';
const variant = ref<Variant>('simple');
const sort = ref<TableSort>({ sortColumn: undefined, sortDirection: 'asc' });
const lastAction = ref('');

const table = computed(() => (variant.value === 'simple' ? SMALL_TABLE : LARGE_TABLE));

const displayColumns = computed(() =>
  table.value.columns.map((c) => ({ ...c, scope: c.id, component: TextCell })),
);

const rows = computed(() => {
  const { sortColumn, sortDirection } = sort.value;
  if (!sortColumn) return table.value.rows;
  const dir = sortDirection === 'asc' ? 1 : -1;
  return [...table.value.rows].sort((a, b) =>
    String(a[sortColumn]).localeCompare(String(b[sortColumn])) * dir,
  );
});

const page = computed(() => ({ count: rows.value.length, pageSize: rows.value.length, page: 1 }));

const onSort = (id: string) => {
  const { sortColumn, sortDirection } = sort.value;
  sort.value = {
    sortColumn: id,
    sortDirection: sortColumn === id && sortDirection === 'asc' ? 'desc' : 'asc',
  };
};

const logAction = (name: string) => (row: any) => {
  lastAction.value = `${name} → row ${row.id}`;
};

const onVariant = (v: Variant) => {
  variant.value = v;
  sort.value = { sortColumn: undefined, sortDirection: 'asc' };
  lastAction.value = '';
};
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-2 items-center">
      <Btn size="sm" :outline="variant !== 'simple'" @click="onVariant('simple')">Simple (3 × 4)</Btn>
      <Btn size="sm" :outline="variant !== 'large'" @click="onVariant('large')">Large (20 × 10, actions)</Btn>
      <span v-if="lastAction" class="text-sm opacity-70">Last action: {{ lastAction }}</span>
    </div>
    <Table
      v-if="variant === 'simple'"
      :display-columns="displayColumns"
      :data="rows"
      :sort="sort"
      @sort="onSort"
    />
    <div v-else class="max-h-96 overflow-auto">
      <Table
        :display-columns="displayColumns"
        :data="rows"
        :sort="sort"
        :page="page"
        :multiselect="true"
        :actions="[{ label: 'Duplicate', action: logAction('Duplicate') }]"
        @sort="onSort"
        @view="logAction('View')($event)"
        @edit="logAction('Edit')($event)"
        @delete="logAction('Delete')($event)"
      />
    </div>
  </div>
</template>
