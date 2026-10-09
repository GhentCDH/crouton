import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import { ControlType } from '@ghentcdh/crouton-core';

import {
  isAutoCompleteControl,
  isBooleanControl,
  isDateControl,
  isDateRangeControl,
  isMarkdownControl,
  isMultiselectControl,
  isNumberFormat,
  isIntegerFormat,
  isObjectControl,
  isRelationControl,
  isSelectControl,
  isStringFormat,
  isTextAreaControl,
  isToggleControl,
} from '../tester';

const control = (format: string): UISchemaElement =>
  ({ type: 'Control', scope: '#/properties/x', options: { format } }) as UISchemaElement;

const stringSchema: JsonSchema = { type: 'string' };

// ControlType values covered by format-based testers.
// Types intentionally excluded from this check:
//   - ControlType.array   → isArrayRenderer keys off schema.type, not options.format
//   - ControlType.custom  → isCustomControl(customType) is a factory, not a fixed tester
//   - ControlType.link    → no tester; link controls fall through to the string renderer
const FORMAT_TESTER_MAP: Array<[string, (u: UISchemaElement, s: JsonSchema) => boolean]> = [
  [ControlType.string,      isStringFormat],
  [ControlType.number,      isNumberFormat],
  [ControlType.integer,     isIntegerFormat],
  [ControlType.textArea,    isTextAreaControl],
  [ControlType.markdown,    isMarkdownControl],
  [ControlType.autocomplete,isAutoCompleteControl],
  [ControlType.select,      isSelectControl],
  [ControlType.mutliSelect, isMultiselectControl],
  [ControlType.toggle,      isToggleControl],
  [ControlType.boolean,     isBooleanControl],
  [ControlType.relation,    isRelationControl],
  [ControlType.date,        isDateControl],
  [ControlType.dateTime,    isDateControl],
  [ControlType.dateRange,   isDateRangeControl],
  [ControlType.object,      isObjectControl],
];

describe('ControlType ↔ tester sync', () => {
  it.each(FORMAT_TESTER_MAP)(
    'ControlType %s has a matching tester',
    (type, tester) => {
      const objectSchema: JsonSchema = { type: 'object', properties: { id: { type: 'string' } } };
      const schema = type === ControlType.object ? objectSchema : stringSchema;
      expect(tester(control(type), schema)).toBe(true);
    },
  );
});
