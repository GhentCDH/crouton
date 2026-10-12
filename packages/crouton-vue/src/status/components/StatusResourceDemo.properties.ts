import type { PropType } from 'vue';

import type { ResourceStatus } from '@ghentcdh/crouton-frontend-core';

export const StatusResourceDemoProperties = {
  resource: { type: Object as PropType<ResourceStatus>, required: true as const },
};
