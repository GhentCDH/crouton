import type { PropType } from 'vue';

import type { CroutonStatus } from '../status.types';

export const StatusStatTilesProperties = {
  status: { type: Object as PropType<CroutonStatus>, required: true as const },
};
