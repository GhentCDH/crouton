import { type PropType } from 'vue';

export type CanvasSelectOption = { label: string; value: unknown };

export const FieldPreviewProperties = {
  type: { type: String, required: true as const },
  value: { type: null as unknown as PropType<unknown>, default: undefined },
  selectOptions: {
    type: Array as PropType<CanvasSelectOption[]>,
    default: () => [],
  },
};