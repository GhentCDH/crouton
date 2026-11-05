import type { EnumSections } from '@crouton/status';
import type { PropType } from 'vue';

export const StatusEnumsGroupProperties = {
  title: { type: String, required: true as const },
  groups: {
    type: Array as PropType<EnumSections['system']>,
    required: true as const,
  },
};
