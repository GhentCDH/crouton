import type { PropType } from 'vue';

import type { IconProp } from '../icons/icon-list';

export type CollapseAction = {
  label?: string;
  icon?: IconProp;
  tooltip?: string;
  disabled?: boolean;
  onClick: () => void;
};

export const CollapseProperties = {
  title: { type: String, required: true as const },
  opened: { type: Boolean, default: true },
  heightFull: { type: Boolean, default: false },
  scrollable: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  actions: {
    type: Array as PropType<Array<CollapseAction>>,
    default: () => [],
  },
};
