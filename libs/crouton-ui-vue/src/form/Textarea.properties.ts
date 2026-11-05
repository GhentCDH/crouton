import { ControlWrapperProperties } from './core/ControlWrapper.properties';

export const TextareaProperties = {
  ...ControlWrapperProperties,
  rows: { type: Number, default: 4 },
  dir: { type: String, default: 'ltr' },
  height: { type: String, default: undefined },
  minHeight: { type: String, default: undefined },
};

export const TextareaEmits = ['change', 'focus', 'blur'];
