import type { PropType } from 'vue';

import type { CroutonStatus } from '../status.types';

export const StatusRawJsonProperties = {
  status: { type: Object as PropType<CroutonStatus>, required: true as const },
};
