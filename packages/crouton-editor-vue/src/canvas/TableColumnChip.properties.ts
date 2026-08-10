import { type PropType } from 'vue';

import type { CanvasField } from './canvas-layout';
import type { CanvasTypeOption } from './type-swaps';

export const TableColumnChipProperties = {
  field: { type: Object as PropType<CanvasField>, required: true as const },
  typeOptions: {
    type: Array as PropType<CanvasTypeOption[]>,
    required: true as const,
  },
};