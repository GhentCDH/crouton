import { type PropType } from 'vue';

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';

export const ResourceJsonPreviewProperties = {
  modelValue: {
    type: Object as PropType<ResourceJsonInput>,
    required: true as const,
  },
  /** When true, the preview is shown expanded without the toggle button. */
  expanded: {
    type: Boolean,
    default: false,
  },
};
