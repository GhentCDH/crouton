import { type PropType } from 'vue';

export const DisplayValueProperties = {
  direction: { type: String, default: 'ltr' },
  path: { type: String, required: true as const },
  displayValue: { type: Object as PropType<unknown>, required: true as const },
  options: { type: Object, required: true as const },
  value: { type: Object as PropType<unknown>, required: true as const },
};
