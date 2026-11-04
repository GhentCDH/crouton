import { type PropType } from 'vue';

/** Props shared by the relation autocomplete and inline renderers. */
export const RelationBaseProperties = {
  options: { type: Object as PropType<any>, required: true as const },
  labelKey: { type: String, required: false as const, default: 'label' },
  label: { type: String, required: true as const },
  valueKey: { type: String, required: false as const, default: 'value' },
  enableCreate: { type: Boolean, required: false as const, default: true },
};
