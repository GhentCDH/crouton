import type { PropType } from 'vue';

import type { MenuWithItems } from './menu.type';

export const SubMenuProperties = {
  label: { type: String, required: true as const },
  items: { type: Array as PropType<MenuWithItems[]>, default: () => [] },
  btnClass: { type: String, default: '' },
  disableArrow: { type: Boolean, default: false },
};
