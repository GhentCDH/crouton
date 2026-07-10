export const DisplayValueProperties = {
  direction: { type: String, default: 'ltr' },
  path: { type: String, required: true as const },
  displayValue: { required: true as const, default: null },
  value: { required: true as const, default: null },
  options: { type: Object, required: true as const },
};
