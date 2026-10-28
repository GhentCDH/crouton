import { describe, expect, it } from 'vitest';

import { hasKey, isNonEmptyString, isRecord } from './guards';

describe('isRecord', () => {
  it('true for plain object', () => expect(isRecord({})).toBe(true));
  it('false for array', () => expect(isRecord([])).toBe(false));
  it('false for null', () => expect(isRecord(null)).toBe(false));
  it('false for string', () => expect(isRecord('x')).toBe(false));
});

describe('hasKey', () => {
  it('true when key present', () => expect(hasKey({ a: 1 }, 'a')).toBe(true));
  it('false when key absent', () => expect(hasKey({ a: 1 }, 'b' as 'a')).toBe(false));
});

describe('isNonEmptyString', () => {
  it('true for non-empty string', () => expect(isNonEmptyString('hi')).toBe(true));
  it('false for empty string', () => expect(isNonEmptyString('')).toBe(false));
  it('false for number', () => expect(isNonEmptyString(1)).toBe(false));
});
