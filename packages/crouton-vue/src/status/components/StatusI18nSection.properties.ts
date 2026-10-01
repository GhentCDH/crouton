import type { PropType } from 'vue';

import type { I18nStatus } from '../status.types';

export const StatusI18nSectionProperties = {
  i18n: { type: Object as PropType<I18nStatus>, required: true as const },
};
