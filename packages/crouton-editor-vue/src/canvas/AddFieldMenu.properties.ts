import { type PropType } from 'vue';

export const AddFieldMenuProperties = {
  hiddenFields: {
    type: Array as PropType<{ id: string; label: string }[]>,
    required: true as const,
  },
  disabled: { type: Boolean, default: false },
};