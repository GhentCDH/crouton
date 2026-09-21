import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import {
  isBooleanControl,
  isDateControl,
  isToggleControl,
} from '../tester';

const control = (
  options: Record<string, any> = {},
  scope = '#/properties/x',
): UISchemaElement =>
  ({ type: 'Control', scope, options }) as UISchemaElement;

const schema = (extra: Record<string, any> = {}): JsonSchema =>
  ({ type: 'string', ...extra }) as JsonSchema;

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
