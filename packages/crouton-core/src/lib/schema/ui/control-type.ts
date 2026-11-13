export const ControlType = {
  number: 'number',
  string: 'string',
  integer: 'integer',
  autocomplete: 'autocomplete',
  textArea: 'textarea',
  markdown: 'markdown',
  array: 'array',
  object: 'object',
  custom: 'custom',
  select: 'select',
  multiSelect: 'multiSelect',
  toggle: 'toggle',
  boolean: 'boolean',
  link: 'link',
  relation: 'relation',
  date: 'date',
  dateTime: 'dateTime',
  dateRange: 'dateRange',
} as const;

export type ControlTypeValue = (typeof ControlType)[keyof typeof ControlType];
