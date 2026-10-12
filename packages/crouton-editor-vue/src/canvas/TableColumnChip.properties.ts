import { type PropType } from 'vue';

import type { CanvasField, CanvasTypeOption  } from '@ghentcdh/crouton-frontend-core';

export const TableColumnChipProperties = {
  field: { type: Object as PropType<CanvasField>, required: true as const },
  typeOptions: {
    type: Array as PropType<CanvasTypeOption[]>,
    required: true as const,
  },
  /** Whether this chip is currently selected for detail editing. */
  selected: { type: Boolean, default: false },
};