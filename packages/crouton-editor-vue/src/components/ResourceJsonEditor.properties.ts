import { type PropType } from 'vue';

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';

/**
 * Props for the standalone resource.json editor component.
 *
 * `modelValue` is the raw, schema-optional shape (`ResourceJsonInput`) —
 * NOT the defaults-applied `ResourceJson` — so what goes in is exactly what
 * comes out, with no silent injection of schema defaults.
 */
export const ResourceJsonEditorProperties = {
  modelValue: {
    type: Object as PropType<ResourceJsonInput>,
    required: true as const,
  },
};
