import { describe, expect, it } from 'vitest';

import { JsonColumnSchema, normalizeUnique } from './Column';

describe('normalizeUnique', () => {
  it('returns undefined when uniqueness is off', () => {
    expect(normalizeUnique(undefined)).toBeUndefined();
    expect(normalizeUnique(false)).toBeUndefined();
  });

  it('normalizes the boolean form', () => {
    expect(normalizeUnique(true)).toEqual({ enabled: true });
  });

  it('carries scope, caseInsensitive and message from the object form', () => {
    expect(
      normalizeUnique({
        scope: ['tenantId'],
        caseInsensitive: true,
        message: 'Taken',
      }),
    ).toEqual({
      enabled: true,
      scope: ['tenantId'],
      caseInsensitive: true,
      message: 'Taken',
    });
  });

  it('accepts `unique` on a column definition', () => {
    const col = JsonColumnSchema.parse({ id: 'email', unique: true });
    expect(col.unique).toBe(true);
    const obj = JsonColumnSchema.parse({
      id: 'email',
      unique: { caseInsensitive: true, message: 'Email already registered' },
    });
    expect(normalizeUnique(obj.unique)).toEqual({
      enabled: true,
      caseInsensitive: true,
      message: 'Email already registered',
    });
  });
});
