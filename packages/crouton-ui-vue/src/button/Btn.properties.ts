import type { PropType } from 'vue';

import { ButtonTag, ButtonType } from './const';
import { Color } from '../const/colors';
import type { Size } from '../const/size';
import type { IconProp } from '../icons/icon-list';

export const BtnProperties = {
  href: { type: String },
  disabled: { type: Boolean, default: false },
  tooltip: { type: String },
  as: { type: String as PropType<ButtonTag>, default: ButtonTag.button },
  icon: { type: [String, Object, Function] as PropType<IconProp> },
  type: { type: String as PropType<ButtonType>, default: ButtonType.button },
  outline: { type: Boolean, default: false },
  color: { type: String as PropType<`${Color}`>, default: Color.primary as `${Color}` },
  size: { type: String as PropType<Size>, default: 'sm' as Size },
  square: { type: Boolean, default: false },
  noBorder: { type: Boolean, default: false },
};

export const BtnEmits = ['click'];
