import type { PropType } from 'vue';

import type { CroutonStatus } from '@ghentcdh/crouton-frontend-core';

export const StatusRawJsonProperties = {
  status: { type: Object as PropType<CroutonStatus>, required: true as const },
};
