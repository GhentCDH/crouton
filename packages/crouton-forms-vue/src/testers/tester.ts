import type { JsonSchema, UISchemaElement } from '@jsonforms/core';

import { ControlType } from '@ghentcdh/crouton-core';

import { and, or, schemaTypeIs, uiTypeIs } from './jsonforms-testers';

export const optionIsIgnoreCase =
  (optionName: string, optionValue: string) =>
  (uischema: UISchemaElement): boolean => {
    const options = (uischema as any).options;
    if (!options) return false;
    const val = options[optionName];
    return val?.toLowerCase() === optionValue?.toLowerCase();
  };

// Matches a control whose (already resolved) schema declares one of the given
// `format`s, e.g. { type: 'string', format: 'date-time' }.
const schemaFormatIsOneOf =
  (...formats: string[]) =>
  (_uischema: UISchemaElement, schema: JsonSchema): boolean => {
    const fmt = (schema as any)?.format;
    return typeof fmt === 'string' && formats.includes(fmt);
  };

// Matches schemas where any variant in anyOf has the given type,
// e.g. anyOf: [{ type: 'string' }, { type: 'null' }]
const anyOfTypeIs =
  (type: string) =>
  (_uischema: UISchemaElement, schema: JsonSchema): boolean => {
    const s = schema as any;
    if (!Array.isArray(s?.anyOf)) return false;
    return s.anyOf.some((sub: any) => sub?.type === type);
  };

export const isAutoCompleteControl = and(
  // uiTypeIs('Control'),
  optionIsIgnoreCase('format', ControlType.autocomplete),
);

export const isTextAreaControl = and(
  uiTypeIs('Control'),
  optionIsIgnoreCase('format', ControlType.textArea),
);

export const isStringFormat = and(
  uiTypeIs('Control'),
  or(
    optionIsIgnoreCase('format', ControlType.string),
    schemaTypeIs('string'),
    anyOfTypeIs('string'),
  ),
);

export const isMarkdownControl = and(
  uiTypeIs('Control'),
  optionIsIgnoreCase('format', ControlType.markdown),
);
export const isObjectControl = and(
  uiTypeIs('Control'),
  // schemaTypeIs('object'),
  (uischema: UISchemaElement) => !(uischema as any).options?.format,
);

export const isArrayRenderer = and(
  schemaTypeIs('array'),
  // optionIsIgnoreCase('format', ControlType.array),
);

export const isCustomControl = (customType: string) => {
  return and(
    optionIsIgnoreCase('format', ControlType.custom),
    optionIsIgnoreCase('type', customType),
  );
};

export const isMultiselectControl = and(
  uiTypeIs('Control'),
  optionIsIgnoreCase('format', ControlType.mutliSelect),
);

export const isSelectControl = and(
  uiTypeIs('Control'),
  optionIsIgnoreCase('format', ControlType.select),
);
export const isBooleanControl = or(
  and(uiTypeIs('Control'), schemaTypeIs('boolean')),
  and(uiTypeIs('Control'), optionIsIgnoreCase('format', ControlType.boolean)),
);
export const isNumberFormat = and(
  uiTypeIs('Control'),
  or(optionIsIgnoreCase('format', ControlType.number), schemaTypeIs('number')),
);
export const isIntegerFormat = and(
  uiTypeIs('Control'),
  or(
    optionIsIgnoreCase('format', ControlType.integer),
    schemaTypeIs('integer'),
  ),
);

export const isDateControl = and(
  uiTypeIs('Control'),
  or(
    optionIsIgnoreCase('format', ControlType.date),
    optionIsIgnoreCase('format', ControlType.dateTime),
    schemaFormatIsOneOf('date', 'date-time'),
  ),
);

export const isRelationControl = and(
  uiTypeIs('Control'),
  optionIsIgnoreCase('format', ControlType.relation),
);

export const isDateRangeControl = and(
  optionIsIgnoreCase('format', 'date-range'),
);

export const isCustomControlRender = (render: string) =>
  and(uiTypeIs('Control'), optionIsIgnoreCase('customRender', render));
