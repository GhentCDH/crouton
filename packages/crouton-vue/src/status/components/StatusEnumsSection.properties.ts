import type { PropType } from 'vue';

import type { EnumSections } from '@ghentcdh/crouton-frontend-core';

export const StatusEnumsSectionProperties = {
  enums: { type: Object as PropType<EnumSections | undefined>, default: undefined },
};
