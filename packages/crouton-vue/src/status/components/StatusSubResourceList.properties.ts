import type { PropType } from 'vue';

import type { SubResourceStatus } from '../status.types';

export const StatusSubResourceListProperties = {
  subResources: { type: Array as PropType<SubResourceStatus[]>, required: true as const },
};
