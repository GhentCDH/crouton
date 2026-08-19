import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import {
  isArrayRenderer,
  isDateRangeControl,
  isObjectControl,
  isStringFormat,
} from './tester';

const control = (options?: Record<string, unknown>): UISchemaElement =>
  ({ type: 'Control', scope: '#/properties/metadata', options }) as any;

const objectSchema = {
  type: 'object',
  properties: { id: { type: 'string' }, name: { type: 'string' } },
} as JsonSchema;

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
    // date-range is an object schema too — its own renderer must win.
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
        { type: 'GridLayout', options: { format: 'object' } } as any,
        objectSchema,
      ),
    ).toBe(false);
  });
});

describe('neighbouring testers still behave', () => {
  it('string format is unaffected by the object tester', () => {
    expect(
      isStringFormat(control({ format: 'text' }), {
        type: 'string',
      } as JsonSchema),
    ).toBe(true);
  });

  it('array schemas match the array renderer', () => {
    expect(
      isArrayRenderer(control({ format: 'array' }), {
        type: 'array',
        items: { type: 'string' },
      } as JsonSchema),
    ).toBe(true);
  });
});
