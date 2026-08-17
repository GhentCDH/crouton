import { describe, expect, it } from 'vitest';

import {
  ColumnTypeSchema,
  columnTypeName,
  columnTypeToJsonSchema,
  isArrayColumnType,
  isObjectColumnType,
} from './ColumnType.schema';

describe('ColumnTypeSchema', () => {
  it('accepts every shorthand', () => {
    for (const shorthand of [
      'string',
      'number',
      'integer',
      'boolean',
      'date',
      'date-time',
      'object',
      'array',
    ]) {
      expect(ColumnTypeSchema.safeParse(shorthand).success).toBe(true);
    }
  });

  it('rejects an unknown shorthand', () => {
    // A bare string that is not a shorthand also fails the fragment branch,
    // because a fragment must be an object.
    expect(ColumnTypeSchema.safeParse('shortstring').success).toBe(false);
  });

  it('accepts a nested object fragment', () => {
    const parsed = ColumnTypeSchema.safeParse({
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        nested: {
          type: 'object',
          properties: { deep: { type: 'integer' } },
        },
      },
      required: ['id'],
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts an array fragment with object items', () => {
    const parsed = ColumnTypeSchema.safeParse({
      type: 'array',
      items: { type: 'object', properties: { tag: { type: 'string' } } },
    });
    expect(parsed.success).toBe(true);
  });

  it('keeps unknown keys so fragments can carry x-* extensions', () => {
    const parsed = ColumnTypeSchema.parse({
      type: 'string',
      'x-field-type': 'select',
    });
    expect(parsed).toMatchObject({ 'x-field-type': 'select' });
  });

  it('rejects a fragment whose nested property is not a fragment', () => {
    expect(
      ColumnTypeSchema.safeParse({
        type: 'object',
        properties: { id: 'string' },
      }).success,
    ).toBe(false);
  });
});

describe('columnTypeToJsonSchema', () => {
  it('expands scalar shorthands', () => {
    expect(columnTypeToJsonSchema('string')).toEqual({ type: 'string' });
    expect(columnTypeToJsonSchema('integer')).toEqual({ type: 'integer' });
    expect(columnTypeToJsonSchema('boolean')).toEqual({ type: 'boolean' });
  });

  it('expands date shorthands to string + format', () => {
    expect(columnTypeToJsonSchema('date')).toEqual({
      type: 'string',
      format: 'date',
    });
    expect(columnTypeToJsonSchema('date-time')).toEqual({
      type: 'string',
      format: 'date-time',
    });
  });

  it('defaults to string when the type is absent', () => {
    expect(columnTypeToJsonSchema(undefined)).toEqual({ type: 'string' });
  });

  it('passes a fragment through unchanged', () => {
    const fragment = {
      type: 'object' as const,
      properties: { id: { type: 'string' } },
    };
    expect(columnTypeToJsonSchema(fragment)).toEqual(fragment);
  });

  it('does not share the returned object with the shorthand table', () => {
    const first = columnTypeToJsonSchema('string');
    (first as Record<string, unknown>).mutated = true;
    expect(columnTypeToJsonSchema('string')).toEqual({ type: 'string' });
  });
});

describe('columnTypeName', () => {
  it('reads the fragment type', () => {
    expect(columnTypeName({ type: 'integer' })).toBe('integer');
  });

  it('collapses a nullable union to its non-null member', () => {
    expect(columnTypeName({ type: ['string', 'null'] })).toBe('string');
    expect(columnTypeName({ type: ['null', 'number'] })).toBe('number');
  });

  it('infers object from properties and array from items', () => {
    expect(columnTypeName({ properties: { a: { type: 'string' } } })).toBe(
      'object',
    );
    expect(columnTypeName({ items: { type: 'string' } })).toBe('array');
  });

  it('falls back to string', () => {
    expect(columnTypeName({})).toBe('string');
    expect(columnTypeName(undefined)).toBe('string');
  });
});

describe('type predicates', () => {
  it('detects object columns', () => {
    expect(isObjectColumnType('object')).toBe(true);
    expect(
      isObjectColumnType({
        type: 'object',
        properties: { id: { type: 'string' } },
      }),
    ).toBe(true);
    expect(isObjectColumnType('string')).toBe(false);
  });

  it('detects array columns', () => {
    expect(isArrayColumnType({ type: 'array', items: { type: 'string' } })).toBe(
      true,
    );
    expect(isArrayColumnType('object')).toBe(false);
  });
});
