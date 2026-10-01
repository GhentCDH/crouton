import type { PropType } from 'vue';

import type { EnumSections } from '../status.types';

export const StatusEnumsSectionProperties = {
  enums: { type: Object as PropType<EnumSections | undefined>, default: undefined },
};
