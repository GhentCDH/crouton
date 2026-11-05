import type { CroutonStatus } from '@crouton/status';
import type { PropType } from 'vue';


export const StatusRawJsonProperties = {
  status: { type: Object as PropType<CroutonStatus>, required: true as const },
};
