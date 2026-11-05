export type ControlEmits = {
  'update:modelValue': [value: any];
  change: [value: any];
  clear: [];
  focus: [event: FocusEvent];
  blur: [event: Event];
};
