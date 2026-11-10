import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import {
  isArrayRenderer,
  isBooleanControl,
  isDateControl,
  isDateRangeControl,
  isIntegerFormat,
  isNumberFormat,
  isObjectControl,
  isStringFormat,
  isToggleControl,
} from '../tester';

const control = (
  options: Record<string, unknown> = {},
  scope = '#/properties/x',
): UISchemaElement =>
  ({ type: 'Control', scope, options }) as UISchemaElement;

const schema = (extra: Record<string, unknown> = {}): JsonSchema =>
  ({ type: 'string', ...extra }) as JsonSchema;

const objectSchema = {
  type: 'object',
  properties: { id: { type: 'string' }, name: { type: 'string' } },
} as JsonSchema;

describe('isDateControl', () => {
  it.each`
    description                       | uischema                          | schema                                  | result
    ${'uischema format: date'}        | ${control({ format: 'date' })}    | ${schema()}                             | ${true}
    ${'uischema format: dateTime'}    | ${control({ format: 'dateTime' })}| ${schema()}                             | ${true}
    ${'case-insensitive format'}      | ${control({ format: 'DATE' })}    | ${schema()}                             | ${true}
    ${'schema format: date'}          | ${control()}                      | ${schema({ format: 'date' })}           | ${true}
    ${'schema format: date-time'}     | ${control()}                      | ${schema({ format: 'date-time' })}      | ${true}
    ${'nullable date (anyOf)'}        | ${control()}                      | ${{ anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] } as JsonSchema} | ${true}
    ${'nullable date (anyOf date)'}   | ${control()}                      | ${{ anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] } as JsonSchema}      | ${true}
    ${'plain string control'}         | ${control()}                      | ${schema()}                             | ${false}
    ${'unrelated format'}             | ${control({ format: 'select' })}  | ${schema()}                             | ${false}
    ${'non-control element'}          | ${{ type: 'VerticalLayout' }}     | ${schema({ format: 'date' })}           | ${false}
  `('$description → $result', ({ uischema, schema: s, result }) => {
    expect(isDateControl(uischema, s)).toBe(result);
  });
});

describe('isStringFormat', () => {
  it.each`
    description                          | uischema                           | schema                                                         | result
    ${'plain string schema'}             | ${control()}                       | ${schema()}                                                    | ${true}
    ${'nullable string (array type)'}    | ${control()}                       | ${{ type: ['string', 'null'] } as unknown as JsonSchema}       | ${true}
    ${'nullable string (anyOf)'}         | ${control()}                       | ${{ anyOf: [{ type: 'string' }, { type: 'null' }] } as JsonSchema} | ${true}
    ${'uischema format: string'}         | ${control({ format: 'string' })}   | ${schema({ type: 'integer' })}                                 | ${true}
    ${'integer schema'}                  | ${control()}                       | ${schema({ type: 'integer' })}                                 | ${false}
    ${'non-control element'}             | ${{ type: 'VerticalLayout' }}      | ${schema()}                                                    | ${false}
  `('$description → $result', ({ uischema, schema: s, result }) => {
    expect(isStringFormat(uischema, s)).toBe(result);
  });
});

describe('isIntegerFormat', () => {
  it.each`
    description                           | uischema                            | schema                                                          | result
    ${'integer schema type'}              | ${control()}                        | ${schema({ type: 'integer' })}                                  | ${true}
    ${'nullable integer (array type)'}    | ${control()}                        | ${{ type: ['integer', 'null'] } as unknown as JsonSchema}       | ${true}
    ${'nullable integer (anyOf)'}         | ${control()}                        | ${{ anyOf: [{ type: 'integer' }, { type: 'null' }] } as JsonSchema} | ${true}
    ${'uischema format: Integer'}         | ${control({ format: 'Integer' })}   | ${schema()}                                                     | ${true}
    ${'plain string'}                     | ${control()}                        | ${schema()}                                                     | ${false}
    ${'non-control element'}              | ${{ type: 'VerticalLayout' }}       | ${schema({ type: 'integer' })}                                  | ${false}
  `('$description → $result', ({ uischema, schema: s, result }) => {
    expect(isIntegerFormat(uischema, s)).toBe(result);
  });
});

describe('isNumberFormat', () => {
  it.each`
    description                          | uischema                           | schema                                                         | result
    ${'number schema type'}              | ${control()}                       | ${schema({ type: 'number' })}                                  | ${true}
    ${'nullable number (array type)'}    | ${control()}                       | ${{ type: ['number', 'null'] } as unknown as JsonSchema}       | ${true}
    ${'nullable number (anyOf)'}         | ${control()}                       | ${{ anyOf: [{ type: 'number' }, { type: 'null' }] } as JsonSchema} | ${true}
    ${'plain string'}                    | ${control()}                       | ${schema()}                                                    | ${false}
  `('$description → $result', ({ uischema, schema: s, result }) => {
    expect(isNumberFormat(uischema, s)).toBe(result);
  });
});

describe('isBooleanControl', () => {
  it.each`
    description                  | uischema                          | schema                       | result
    ${'boolean schema type'}     | ${control()}                      | ${schema({ type: 'boolean' })}| ${true}
    ${'boolean format option'}   | ${control({ format: 'boolean' })} | ${schema()}                  | ${true}
    ${'plain string'}            | ${control()}                      | ${schema()}                  | ${false}
  `('$description → $result', ({ uischema, schema: s, result }) => {
    expect(isBooleanControl(uischema, s)).toBe(result);
  });
});

describe('isToggleControl', () => {
  it.each`
    description                  | uischema                          | schema        | result
    ${'toggle format option'}    | ${control({ format: 'toggle' })}  | ${schema()}   | ${true}
    ${'case-insensitive format'} | ${control({ format: 'TOGGLE' })}  | ${schema()}   | ${true}
    ${'unrelated format'}        | ${control({ format: 'select' })}  | ${schema()}   | ${false}
    ${'plain control'}           | ${control()}                      | ${schema()}   | ${false}
    ${'non-control element'}     | ${{ type: 'VerticalLayout' }}     | ${schema()}   | ${false}
  `('$description → $result', ({ uischema, schema: s, result }) => {
    expect(isToggleControl(uischema, s)).toBe(result);
  });
});

describe('isObjectControl', () => {
  it('matches the object format emitted for an object column', () => {
    expect(isObjectControl(control({ format: 'object' }), objectSchema)).toBe(
      true,
    );
  });

  it('matches an object schema with properties and no declared format', () => {
    expect(isObjectControl(control({}), objectSchema)).toBe(true);
    expect(isObjectControl(control(), objectSchema)).toBe(true);
  });

  it('does not match a scalar schema', () => {
    expect(
      isObjectControl(control(), { type: 'string' } as JsonSchema),
    ).toBe(false);
  });

  it('does not match an object schema with no properties', () => {
    expect(
      isObjectControl(control(), { type: 'object' } as JsonSchema),
    ).toBe(false);
  });

  it('does not hijack a control that names another format', () => {
    // date-range is an object schema too — its own tester must win.
    const dateRange = control({ format: 'date-range' });
    expect(isObjectControl(dateRange, objectSchema)).toBe(false);
    expect(isDateRangeControl(dateRange, objectSchema)).toBe(true);

    expect(isObjectControl(control({ format: 'relation' }), objectSchema)).toBe(
      false,
    );
    expect(isObjectControl(control({ format: 'select' }), objectSchema)).toBe(
      false,
    );
  });

  it('does not match a non-Control element', () => {
    expect(
      isObjectControl(
        { type: 'GridLayout', options: { format: 'object' } } as unknown as UISchemaElement,
        objectSchema,
      ),
    ).toBe(false);
  });
});

describe('isDateRangeControl', () => {
  it('matches the date-range format option regardless of case', () => {
    expect(isDateRangeControl(control({ format: 'date-range' }), schema())).toBe(
      true,
    );
    expect(isDateRangeControl(control({ format: 'Date-Range' }), schema())).toBe(
      true,
    );
  });

  it('does not match other formats', () => {
    expect(isDateRangeControl(control({ format: 'date' }), schema())).toBe(
      false,
    );
    expect(isDateRangeControl(control(), schema())).toBe(false);
    expect(
      isDateRangeControl({ type: 'VerticalLayout' } as UISchemaElement, schema()),
    ).toBe(false);
  });
});

describe('isArrayRenderer', () => {
  it('matches array schemas', () => {
    expect(
      isArrayRenderer(control({ format: 'array' }), {
        type: 'array',
        items: { type: 'string' },
      } as JsonSchema),
    ).toBe(true);
  });

  it('does not match scalar schemas', () => {
    expect(isArrayRenderer(control({ format: 'array' }), schema())).toBe(false);
  });
});
