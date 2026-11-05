export const ControlType = {
  number: 'number',
  string: 'string',
  integer: 'Integer',
  autocomplete: 'autocomplete',
  textArea: 'textarea',
  markdown: 'markdown',
  array: 'array',
  object: 'object',
  custom: 'custom',
  select: 'select',
  mutliSelect: 'mutliSelect',
  toggle: 'toggle',
  boolean: 'boolean',
  link: 'link',
  relation: 'relation',
  date: 'date',
  dateTime: 'dateTime',
  dateRange: 'date-range',
} as const;

export type ControlTypeValue = (typeof ControlType)[keyof typeof ControlType];
