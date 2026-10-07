import type { PropType } from 'vue';

import type { FormDef } from '../../composables/useCrouton';

export const StatusResourceDemoPreviewProperties = {
  def: { type: Object as PropType<FormDef>, required: true as const },
};
