/**
 * Old `fieldInput.type`/`format` spellings. The runtime rewrites them before
 * validation; `crouton migrate` rewrites them in the file; `crouton validate`
 * flags them with a hint to migrate.
 */
export const FIELD_INPUT_TYPE_ALIASES: Record<string, string> = {
  Integer: 'integer',
  mutliSelect: 'multiSelect',
  'date-range': 'dateRange',
  text: 'string',
};
