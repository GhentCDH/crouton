import type { SubResourceStatus } from '@crouton/status';
import type { PropType } from 'vue';


export const StatusSubResourceListProperties = {
  subResources: {
    type: Array as PropType<SubResourceStatus[]>,
    required: true as const,
  },
  parentName: { type: String, required: true as const },
};
