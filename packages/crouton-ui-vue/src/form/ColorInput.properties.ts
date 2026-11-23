import { InputEmits, InputProperties } from './Input.properties';

export const ColorInputProperties = {
  ...InputProperties,
  placeholder: { type: String, default: '#rrggbb' },
};

export const ColorInputEmits = InputEmits;
