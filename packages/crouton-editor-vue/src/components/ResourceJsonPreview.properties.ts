import { type PropType } from 'vue';

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';

export const ResourceJsonPreviewProperties = {
  modelValue: {
    type: Object as PropType<ResourceJsonInput>,
    required: true as const,
  },
};
