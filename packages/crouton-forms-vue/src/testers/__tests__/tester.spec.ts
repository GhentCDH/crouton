import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import { isBooleanControl, isDateControl } from '../tester';

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
