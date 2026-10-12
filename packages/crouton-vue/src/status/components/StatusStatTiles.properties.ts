import type { PropType } from 'vue';

import type { CroutonStatus } from '@ghentcdh/crouton-frontend-core';

export const StatusStatTilesProperties = {
  status: { type: Object as PropType<CroutonStatus>, required: true as const },
};
