import type { PropType } from 'vue';

import type { UseResource } from '../resource';

export const RelationTableProperties = {
  label: { type: String, required: true as const },
  resource: { type: Object as PropType<UseResource>, required: true as const },
  values: { type: Array as PropType<any[]>, required: true as const },
};
