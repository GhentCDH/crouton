import type { PropType } from 'vue';

import { ListProperties } from './ListResults.properties';
import { ControlWrapperProperties } from '../core/ControlWrapper.properties';

export const SelectProperties = {
  ...ControlWrapperProperties,
  options: { type: Array as PropType<Array<any>>, required: true as const },
  /** Key to use as the display label when options are objects */
  labelKey: { type: String, default: 'label' },
  /** Key to use as the stored value when options are objects */
  valueKey: { type: String, default: 'value' },
  /** add a new button next to the list */
  enableCreate: { type: Boolean, default: false },
  /** Whether to show the clear button when a value is selected */
  clearable: { type: Boolean, default: false },
  /** Alternative to v-model — accepts a string id or a full option object */
  value: { type: null as unknown as PropType<any>, default: undefined },
};

export const SelectWrapperEmits = ['select', 'clear', 'close', 'create'];

export const SelectWrapperProperties = {
  ...ListProperties,
  ...SelectProperties,
  isOpen: { type: Boolean, default: false },
  isActive: { type: Function, default: (item: any) => false },
};
