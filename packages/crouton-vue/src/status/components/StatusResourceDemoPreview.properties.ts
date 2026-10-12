import type { PropType } from 'vue';

import type { ResourceDefinition } from '../../composables/useCrouton';

export const StatusResourceDemoPreviewProperties = {
  def: { type: Object as PropType<ResourceDefinition>, required: true as const },
};
