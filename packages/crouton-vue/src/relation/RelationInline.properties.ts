import { type PropType } from 'vue';

export const RelationInlineProperties = {
  options: { type: Object as PropType<any>, required: true as const },
  labelKey: { type: String, required: false as const, default: 'label' },
  label: { type: String, required: true as const },
  valueKey: { type: String, required: false as const, default: 'value' },
  values: { type: Array as PropType<any[]>, required: true as const },
  enableCreate: { type: Boolean, required: false as const, default: true },
};
