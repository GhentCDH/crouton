import type { EnumSections } from '@crouton/status';
import type { PropType } from 'vue';


export const StatusEnumsSectionProperties = {
  enums: {
    type: Object as PropType<EnumSections | undefined>,
    default: undefined,
  },
};
