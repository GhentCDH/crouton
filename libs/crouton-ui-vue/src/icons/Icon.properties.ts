import type { PropType } from 'vue';

import type { IconProp } from './icon-list';
import type { Size } from '../const/size';

export const IconProperties = {
  icon: { type: [String, Object, Function] as PropType<IconProp> },
  size: { type: String as PropType<Size> },
};