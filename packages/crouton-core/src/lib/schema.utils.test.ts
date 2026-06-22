import { describe, expect, it } from 'vitest';

import { enforceRequiredStringMinLength } from './schema.utils';

describe('enforceRequiredStringMinLength', () => {
  it('returns schema unchanged when there are no properties', () => {
    const schema = { type: 'object' } as any;
    expect(enforceRequiredStringMinLength(schema)).toBe(schema);
  });

  it('adds minLength: 1 to a required string field', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    } as any;
    const result = enforceRequiredStringMinLength(schema);
    expect(result.properties.name.minLength).toBe(1);
  });

  it('adds minLength: 1 to an optional string field (not in required)', () => {
    const schema = {
      type: 'object',
      properties: { desc: { type: 'string' } },
      required: [],
    } as any;
    const result = enforceRequiredStringMinLength(schema);
    expect(result.properties.desc.minLength).toBe(1);
  });

  it('adds minLength: 1 to a nullable string field removed from required', () => {
    // Simulates what create-schema.ts does after simplifyNullableAnyOf:
    // nullable fields are collapsed to { type: 'string' } and removed from required.
    const schema = {
      type: 'object',
      properties: { email: { type: 'string' } },
      required: [], // removed because it was nullable
    } as any;
    const result = enforceRequiredStringMinLength(schema);
    expect(result.properties.email.minLength).toBe(1);
  });

  it('does not overwrite an explicit minLength already set', () => {
    const schema = {
      type: 'object',
      properties: { code: { type: 'string', minLength: 3 } },
      required: ['code'],
    } as any;
    const result = enforceRequiredStringMinLength(schema);
    expect(result.properties.code.minLength).toBe(3);
  });

  it('does not add minLength to non-string fields', () => {
    const schema = {
      type: 'object',
      properties: {
        count: { type: 'number' },
        active: { type: 'boolean' },
      },
      required: ['count', 'active'],
    } as any;
    const result = enforceRequiredStringMinLength(schema);
    expect(result.properties.count.minLength).toBeUndefined();
    expect(result.properties.active.minLength).toBeUndefined();
  });

  it('returns the same reference when nothing changed', () => {
    const schema = {
      type: 'object',
      properties: { count: { type: 'number' } },
      required: [],
    } as any;
    expect(enforceRequiredStringMinLength(schema)).toBe(schema);
  });

  it('recurses into nested object properties', () => {
    const schema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: { city: { type: 'string' } },
          required: ['city'],
        },
      },
    } as any;
    const result = enforceRequiredStringMinLength(schema);
    expect(result.properties.address.properties.city.minLength).toBe(1);
  });
});
