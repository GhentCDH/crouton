import { ControlWrapperProperties } from './core/ControlWrapper.properties';

export const InputNumberProperties = {
  ...ControlWrapperProperties,
  steps: { type: Number, default: 1 },
};

export const InputNumberEmits = ['change', 'focus', 'blur'];
