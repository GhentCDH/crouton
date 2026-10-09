import type { PropType } from 'vue';

export const PaginationComponentProperties = {
  totalItems: { type: Number, default: 0 },
  itemsPerPage: { type: Number, default: 1 },
  currentPage: { type: Number, default: 1 },
  pageSizeOptions: { type: Array as PropType<number[]>, default: () => [10, 20, 50, 100] },
};

export const PaginationComponentEmits = ['updatePage', 'updatePageSize'];
