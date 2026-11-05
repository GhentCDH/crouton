import type { PropType } from 'vue';

import type { ColumnDef } from '../column.model';

export const SortHeaderProperties = {
  column: { type: Object as PropType<ColumnDef>, required: true as const },
  sortColumn: { type: String },
  sortDirection: { type: String as PropType<'asc' | 'desc'> },
};

export const SortHeaderEmits = ['sort'];
