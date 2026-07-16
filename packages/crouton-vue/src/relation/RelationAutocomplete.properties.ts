import { type PropType } from 'vue';

export const RelationAutocompleteProperties = {
  options: { type: Object as PropType<any>, required: true as const },
  labelKey: { type: String, required: false as const, default: 'label' },
  label: { type: String, required: true as const },
  valueKey: { type: String, required: false as const, default: 'value' },
  value: { type: [String, Number, Object] as PropType<string | number | Record<string, unknown> | null>, default: null },
  enableCreate: { type: Boolean, required: false as const, default: true },
};
