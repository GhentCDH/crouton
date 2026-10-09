import type { PropType } from 'vue';

export type FilterItem = {
  id: string;
  label: string;
  count: number;
  color?: string;
};

export const FilterProperties = {
  title: { type: String, required: true as const },
  items: {
    type: Array as PropType<Array<Record<string, any>>>,
    required: true as const,
  },
  modelValue: {
    type: Array as PropType<Array<FilterItem | any>>,
    default: () => [],
  },
  labelKey: { type: String, default: 'label' },
  valueKey: { type: String, default: 'id' },
  colorKey: { type: String, default: undefined },
  countKey: { type: String, default: 'count' },
  counts: {
    type: Object as PropType<Record<string, number>>,
    default: undefined,
  },
  opened: { type: Boolean, default: true },
};

export const FilterEmits = ['update:modelValue'];
