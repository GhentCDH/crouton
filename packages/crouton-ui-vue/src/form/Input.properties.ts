import { ControlWrapperProperties } from './core/ControlWrapper.properties';

export const InputProperties = {
  ...ControlWrapperProperties,
  type: { type: String, default: 'text' },
  clearable: { type: Boolean, default: false },
};

export const InputEmits = ['change', 'focus', 'blur', 'clear'];
