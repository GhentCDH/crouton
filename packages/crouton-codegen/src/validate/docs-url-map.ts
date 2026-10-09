const BASE = 'https://ghentcdh.github.io/crouton/guide/2.resources/field-inputs';

export const FIELD_INPUT_DOCS_URL: Record<string, string> = {
  string: `${BASE}/string`,
  number: `${BASE}/number`,
  Integer: `${BASE}/number`,
  textarea: `${BASE}/textarea`,
  markdown: `${BASE}/markdown`,
  boolean: `${BASE}/boolean`,
  toggle: `${BASE}/toggle`,
  select: `${BASE}/select`,
  mutliSelect: `${BASE}/select`,
  autocomplete: `${BASE}/autocomplete`,
  date: `${BASE}/date`,
  dateTime: `${BASE}/date`,
  'date-range': `${BASE}/date-range`,
  relation: `${BASE}/relation`,
  array: `${BASE}/array`,
  custom: `${BASE}/custom`,
};
