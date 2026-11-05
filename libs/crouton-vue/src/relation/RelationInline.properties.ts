import { type PropType } from 'vue';

import { RelationBaseProperties } from './RelationBase.properties';

export const RelationInlineProperties = {
  ...RelationBaseProperties,
  values: { type: Array as PropType<any[]>, required: true as const },
};
