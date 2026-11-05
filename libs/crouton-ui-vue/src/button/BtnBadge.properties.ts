import type { PropType } from 'vue';

import { ButtonType } from './const';
import { Color } from '../const/colors';
import type { Size } from '../const/size';
import type { IconProp } from '../icons/icon-list';

export const BtnBadgeProperties = {
  icon: { type: [String, Object, Function] as PropType<IconProp> },
  type: { type: String as PropType<ButtonType>, default: ButtonType.button },
  color: { type: String as PropType<Color>, default: Color.primary },
  disabled: { type: Boolean, default: false },
  size: { type: String as PropType<Size>, default: 'sm' as Size },
};

export const BtnBadgeEmits = ['click'];