import { type PropType } from 'vue';

import { RelationBaseProperties } from './RelationBase.properties';

export const RelationInlineProperties = {
  ...RelationBaseProperties,
  values: { type: Array as PropType<Record<string, unknown>[]>, required: true as const },
};
