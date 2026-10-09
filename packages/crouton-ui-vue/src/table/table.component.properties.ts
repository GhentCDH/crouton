import type { PropType } from 'vue';

import type { DisplayColumn, TableAction } from './table.model';

export type TablePage = {
  count: number;
  pageSize: number;
  page: number;
};

export type TableSort = {
  sortColumn?: string;
  sortDirection: 'asc' | 'desc';
};

export const TableComponentProperties = {
  loading: { type: Boolean, default: false as const },
  multiselect: { type: Boolean, default: false as const },
  actions: { type: Array as PropType<TableAction[]> },
  data: { type: Array as PropType<any[]> },
  displayColumns: {
    type: Array as PropType<DisplayColumn[]>,
    required: true as const,
  },
  page: { type: Object as PropType<TablePage> },
  sort: { type: Object as PropType<TableSort> },
};

export const TableComponentEmits = [
  'updatePage',
  'updatePageSize',
  'sort',
  'selectionChange',
];
