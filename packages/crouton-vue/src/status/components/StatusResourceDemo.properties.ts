import type { ResourceStatus } from '@crouton/status';
import type { PropType } from 'vue';


export const StatusResourceDemoProperties = {
  resource: {
    type: Object as PropType<ResourceStatus>,
    required: true as const,
  },
};
