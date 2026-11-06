export type ControlEmits = {
  'update:modelValue': [value: unknown];
  change: [value: unknown];
  clear: [];
  focus: [event: FocusEvent];
  blur: [event: Event];
};
