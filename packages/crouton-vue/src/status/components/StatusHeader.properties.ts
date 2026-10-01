import type { PropType } from 'vue';

import type { CroutonStatus } from '../status.types';

export const StatusHeaderProperties = {
  status: { type: Object as PropType<CroutonStatus | null>, default: null },
  loading: { type: Boolean, required: true as const },
  lastChecked: { type: Object as PropType<Date | null>, default: null },
  autoRefresh: { type: Boolean, required: true as const },
};
