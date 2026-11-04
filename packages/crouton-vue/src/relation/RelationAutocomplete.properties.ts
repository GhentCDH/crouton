import { type PropType } from 'vue';

import { RelationBaseProperties } from './RelationBase.properties';

export const RelationAutocompleteProperties = {
  ...RelationBaseProperties,
  value: {
    type: [String, Number, Object] as PropType<
      string | number | Record<string, unknown> | null
    >,
    default: null,
  },
  formValues: {
    type: Object as PropType<Record<string, unknown> | null>,
    required: false as const,
    default: null,
  },
};
