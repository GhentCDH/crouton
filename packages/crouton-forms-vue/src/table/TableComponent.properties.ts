import type { JsonSchema, Layout } from '@jsonforms/core';
import type { PropType } from 'vue';

import type { TableAction, TablePage, TableSort } from '@ghentcdh/ui';

import type { CellRendererEntry } from './cells';

export const TableComponentProperties = {
  id: { type: String, required: true as const },
  uiSchema: { type: Object as PropType<Layout>, required: true as const },
  schema: { type: Object as PropType<JsonSchema>, required: true as const },
  reload: { type: Number },
  loading: { type: Boolean, default: false as const },
  multiselect: { type: Boolean, default: false as const },
  actions: { type: Array as PropType<TableAction[]> },
  data: { type: Array as PropType<any[]> },
  page: { type: Object as PropType<TablePage> },
  sort: { type: Object as PropType<TableSort> },
  cellRenderers: { type: Array as PropType<CellRendererEntry[]> },
  hidePagination: { type: Boolean, default: false as const },
};

export const TableComponentEmits = [
  'updatePage',
  'updatePageSize',
  'sort',
  'selectionChange',
];
