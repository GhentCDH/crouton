import type { PropType } from 'vue';

import type { ResourceStatus } from '../status.types';

export const StatusResourceListProperties = {
  resources: { type: Array as PropType<ResourceStatus[]>, required: true as const },
  filter: { type: String, default: 'all' },
  search: { type: String, default: '' },
  isDev: { type: Boolean, default: false },
  actionLoading: { type: String as PropType<string | null>, default: null },
};
