import type { PropType } from 'vue';

import type { ResourceStatus } from '../status.types';

export const StatusResourceRowProperties = {
  resource: { type: Object as PropType<ResourceStatus>, required: true as const },
  expanded: { type: Boolean, required: true as const },
  isDev: { type: Boolean, default: false },
  actionLoading: { type: String as PropType<string | null>, default: null },
};
