---
title: Tables & trees
---

<script setup>
import { computed, ref } from 'vue';
import { DownloadCsvButton, IconEnum, PaginationComponent, Table, TextCell, TreeView } from '@ghentcdh/crouton-vue';

const cities = ['Antwerp', 'Bruges', 'Brussels', 'Ghent', 'Leuven', 'Liège', 'Namur', 'Mons', 'Hasselt', 'Kortrijk', 'Ostend', 'Mechelen'];
const rows = cities.map((name, i) => ({ id: i + 1, name, province: i % 2 ? 'Flanders' : 'Wallonia', url: `https://example.org/${name.toLowerCase()}` }));

const columns = [
  { id: 'name', label: 'Name', scope: '#/properties/name', component: TextCell, options: { sortable: true } },
  { id: 'province', label: 'Province', scope: '#/properties/province', component: TextCell },
  { id: 'url', label: 'Website', scope: '#/properties/url', component: TextCell },
];

const lastAction = ref('—');
const actions = [
  { icon: IconEnum.Edit, tooltip: 'Edit', action: (row) => (lastAction.value = `Edit ${row.name}`) },
  { icon: IconEnum.Delete, tooltip: 'Delete', action: (row) => (lastAction.value = `Delete ${row.name}`) },
];

const page = ref({ page: 1, pageSize: 5, count: rows.length });
const sort = ref({ sortColumn: 'name', sortDirection: 'asc' });
const visibleRows = computed(() => {
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name) * (sort.value.sortDirection === 'asc' ? 1 : -1));
  const start = (page.value.page - 1) * page.value.pageSize;
  return sorted.slice(start, start + page.value.pageSize);
});
const onSort = (column) =>
  (sort.value = {
    sortColumn: column,
    sortDirection: sort.value.sortColumn === column && sort.value.sortDirection === 'asc' ? 'desc' : 'asc',
  });

const csvColumns = [
  { key: 'name', label: 'Name' },
  { key: 'province', label: 'Province' },
];

const pagerPage = ref(1);
const pagerSize = ref(10);

const tree = [
  { id: 'be', label: 'Belgium', children: [
    { id: 'fl', label: 'Flanders', tag: '5', children: [{ id: 'gh', label: 'Ghent' }, { id: 'an', label: 'Antwerp' }] },
    { id: 'wa', label: 'Wallonia', tag: '5', children: [{ id: 'na', label: 'Namur' }] },
  ] },
];
const activeNode = ref('gh');
</script>

# Tables & trees

## Table

Presentational table: you pass the rows, columns, `page` and `sort`, and handle the emitted `updatePage`, `updatePageSize` and `sort` (column id) events. For a table backed by a resource, use `ResourceTable` (see [CroutonForm](../4.frontend/croutonform.md)).

Each column renders through its `component` (`TextCell`, `BooleanCell` or your own), which receives the row as `data`.

<ClientOnly>
<div class="demo demo-stack">
  <Table
    :data="visibleRows"
    :display-columns="columns"
    :actions="actions"
    :page="page"
    :sort="sort"
    :page-sizes="[5, 10]"
    @update-page="(p) => (page = { ...page, page: p })"
    @update-page-size="(s) => (page = { ...page, page: 1, pageSize: s })"
    @sort="onSort"
  />
  <span class="demo-note">Last action: {{ lastAction }}</span>
</div>
</ClientOnly>

```vue
<Table
  :data="rows"
  :display-columns="[{ id: 'name', label: 'Name', scope: '#/properties/name', component: TextCell }]"
  :actions="[{ icon: IconEnum.Edit, tooltip: 'Edit', action: edit }]"
  :page="{ page: 1, pageSize: 5, count: total }"
  :sort="{ sortColumn: 'name', sortDirection: 'asc' }"
  @update-page="loadPage"
  @sort="resort"
/>
```

Other props: `loading`, `multiselect` (emits `selectionChange`), `density="compact"`, `emptyText`, `rowClick`.

## Pagination

Used inside `Table`, also available standalone.

<ClientOnly>
<div class="demo demo-stack">
  <PaginationComponent :total-items="137" :items-per-page="pagerSize" :current-page="pagerPage" @update-page="(p) => (pagerPage = p)" @update-page-size="(s) => { pagerSize = s; pagerPage = 1; }" />
  <span class="demo-note">Page {{ pagerPage }}, {{ pagerSize }} per page</span>
</div>
</ClientOnly>

```vue
<PaginationComponent :total-items="137" :items-per-page="size" :current-page="page" @update-page="(p) => (page = p)" />
```

## Download CSV

Exports rows as an Excel-friendly CSV: `;` separator, UTF-8 with BOM, every cell quoted, dates as
`dd/MM/yyyy HH:mm`, booleans as translated yes/no. `rows` is an array or an (async) function called on click.
Resource tables show this button via `layout.table.download` (see [Layout](../2.resources/layout.md#csv-download)).

<ClientOnly>
<div class="demo">
  <DownloadCsvButton :columns="csvColumns" :rows="rows" file-name="cities" />
</div>
</ClientOnly>

```vue
<script setup>
import { DownloadCsvButton, downloadCsv } from '@ghentcdh/crouton-vue';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'author.name', label: 'Author' },            // dot path
  { key: 'tags', label: 'Tags', value: (r) => r.tags.map((t) => t.label) },
];
// or without a button: downloadCsv(columns, rows, 'cities');
</script>

<DownloadCsvButton :columns="columns" :rows="rows" file-name="cities" />
```

## Tree view

Clicking a node with children toggles it; clicking a leaf emits `select`. `tag` renders a small badge.

<ClientOnly>
<div class="demo demo-stack">
  <div class="w-64">
    <TreeView :data="tree" :active="activeNode" @select="(n) => (activeNode = n.id)" />
  </div>
  <span class="demo-note">Active: {{ activeNode }}</span>
</div>
</ClientOnly>

```vue
<TreeView :data="[{ id: 'be', label: 'Belgium', children: [{ id: 'gh', label: 'Ghent' }] }]" :active="active" @select="(n) => (active = n.id)" />
```
