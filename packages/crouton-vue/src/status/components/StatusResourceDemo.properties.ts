import type { PropType } from 'vue';

import type { ResourceStatus } from '../status.types';

export const StatusResourceDemoProperties = {
  resource: { type: Object as PropType<ResourceStatus>, required: true as const },
};
