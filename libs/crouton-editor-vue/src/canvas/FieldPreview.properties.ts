import { type PropType } from 'vue';

export type CanvasSelectOption = { label: string; value: unknown };

export const FieldPreviewProperties = {
  type: { type: String, required: true as const },
  value: { type: [String, Number, Boolean, Object] as PropType<unknown>, required: false as const },
  selectOptions: {
    type: Array as PropType<CanvasSelectOption[]>,
    default: () => [],
  },
};