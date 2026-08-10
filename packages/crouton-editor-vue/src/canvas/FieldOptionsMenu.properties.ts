import { type PropType } from 'vue';

import type { CanvasTypeOption } from './type-swaps';

export const FieldOptionsMenuProperties = {
  typeOptions: {
    type: Array as PropType<CanvasTypeOption[]>,
    required: true as const,
  },
  currentType: { type: String, required: true as const },
  removeLabel: { type: String, default: 'Remove' },
};