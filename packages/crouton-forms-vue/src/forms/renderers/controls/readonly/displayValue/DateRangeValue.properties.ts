import { type PropType } from 'vue';

export const DateRangeValueProperties = {
  options: { type: Object, required: true as const },
  value: {
    // An object, or (string DB column) its JSON string.
    type: [Object, String, null] as PropType<Record<string, unknown> | string | null>,
    required: true as const,
  },
};