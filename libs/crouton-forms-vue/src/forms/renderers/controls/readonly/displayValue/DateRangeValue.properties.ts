import { type PropType } from 'vue';

export const DateRangeValueProperties = {
  options: { type: Object, required: true as const },
  value: {
    type: [Object, null] as PropType<Record<string, unknown> | null>,
    required: true as const,
  },
};