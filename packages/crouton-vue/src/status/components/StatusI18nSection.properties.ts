import type { I18nStatus } from '@crouton/status';
import type { PropType } from 'vue';


export const StatusI18nSectionProperties = {
  i18n: { type: Object as PropType<I18nStatus>, required: true as const },
};
