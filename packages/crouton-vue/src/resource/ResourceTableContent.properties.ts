import type { Component } from 'vue';
import type { PropType } from 'vue';

import type { UseResource } from './useResources';

export const ResourceTableContentProperties = {
  resource: { type: Object as PropType<UseResource>, required: true as const },
  config: { type: Object as PropType<any>, required: true as const },
  label: { type: String, required: false },
  tableHeading: { type: String as PropType<string | null>, default: null },
  tableComponent: {
    type: Object as PropType<Component>,
    required: true as const,
  },
  hideToolbar: { type: Boolean, default: false },
  hideTitle: { type: Boolean, default: false },
  isDev: { type: Boolean, default: false },
  id: { type: String, required: true as const },
};
