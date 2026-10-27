import type { CroutonStatus } from '@crouton/status';
import type { PropType } from 'vue';


export const StatusStatTilesProperties = {
  status: { type: Object as PropType<CroutonStatus>, required: true as const },
};
