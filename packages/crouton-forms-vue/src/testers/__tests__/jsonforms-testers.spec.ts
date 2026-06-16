import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import {
  NOT_APPLICABLE,
  and,
  or,
  rankWith,
  schemaTypeIs,
  uiTypeIs,
} from '../jsonforms-testers';

const control = (extra: Record<string, any> = {}): UISchemaElement =>
  ({ type: 'Control', scope: '#/properties/x', ...extra }) as UISchemaElement;

const layout = (type: string): UISchemaElement =>
  ({ type }) as UISchemaElement;

const schema = (type: string): JsonSchema => ({ type }) as JsonSchema;

describe('uiTypeIs', () => {
  it('matches the element type', () => {
    expect(uiTypeIs('Control')(control(), schema('string'))).toBe(true);
    expect(uiTypeIs('VerticalLayout')(layout('VerticalLayout'), schema('string'))).toBe(true);
  });

  it('rejects a different type', () => {
    expect(uiTypeIs('Control')(layout('VerticalLayout'), schema('string'))).toBe(false);
  });

  it('rejects empty input', () => {
    expect(uiTypeIs('Control')(undefined as any, schema('string'))).toBe(false);
  });
});

describe('schemaTypeIs', () => {
  it.each`
    schemaType   | expected     | result
    ${'string'}  | ${'string'}  | ${true}
    ${'number'}  | ${'number'}  | ${true}
    ${'boolean'} | ${'boolean'} | ${true}
    ${'array'}   | ${'array'}   | ${true}
    ${'string'}  | ${'number'}  | ${false}
  `(
    'schema $schemaType vs $expected → $result',
    ({ schemaType, expected, result }) => {
      expect(schemaTypeIs(expected)(control(), schema(schemaType))).toBe(result);
    },
  );

  it('only matches Control elements', () => {
    expect(schemaTypeIs('string')(layout('VerticalLayout'), schema('string'))).toBe(false);
  });
});

describe('and', () => {
  it('requires every tester to match', () => {
    const t = and(uiTypeIs('Control'), schemaTypeIs('string'));
    expect(t(control(), schema('string'))).toBe(true);
    expect(t(control(), schema('number'))).toBe(false);
    expect(t(layout('VerticalLayout'), schema('string'))).toBe(false);
  });
});

describe('or', () => {
  it('matches when any tester matches', () => {
    const t = or(schemaTypeIs('string'), schemaTypeIs('number'));
    expect(t(control(), schema('string'))).toBe(true);
    expect(t(control(), schema('number'))).toBe(true);
    expect(t(control(), schema('boolean'))).toBe(false);
  });
});

describe('rankWith', () => {
  it('returns the rank when the tester matches', () => {
    expect(rankWith(12, uiTypeIs('Control'))(control(), schema('string'))).toBe(12);
  });

  it('returns NOT_APPLICABLE when it does not match', () => {
    expect(rankWith(12, uiTypeIs('Control'))(layout('VerticalLayout'), schema('string'))).toBe(
      NOT_APPLICABLE,
    );
    expect(NOT_APPLICABLE).toBe(-1);
  });
});
