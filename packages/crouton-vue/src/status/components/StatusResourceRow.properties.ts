import type { ResourceStatus } from '@crouton/status';
import type { PropType } from 'vue';


export const StatusResourceRowProperties = {
  resource: {
    type: Object as PropType<ResourceStatus>,
    required: true as const,
  },
  expanded: { type: Boolean, required: true as const },
  isDev: { type: Boolean, default: false },
  actionLoading: { type: String as PropType<string | null>, default: null },
};
