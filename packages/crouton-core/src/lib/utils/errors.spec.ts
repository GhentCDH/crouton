import { describe, expect, it } from 'vitest';

import { errorMessage, isPrismaKnownError } from './errors';

describe('errorMessage', () => {
  it('returns message from Error', () => expect(errorMessage(new Error('oops'))).toBe('oops'));
  it('returns string as-is', () => expect(errorMessage('bad')).toBe('bad'));
  it('converts number', () => expect(errorMessage(42)).toBe('42'));
  it('converts null', () => expect(errorMessage(null)).toBe('null'));
});

describe('isPrismaKnownError', () => {
  it('true for object with string code', () => expect(isPrismaKnownError({ code: 'P2002', message: 'x' })).toBe(true));
  it('false for Error without code', () => expect(isPrismaKnownError(new Error('x'))).toBe(false));
  it('false for null', () => expect(isPrismaKnownError(null)).toBe(false));
  it('false when code is not string', () => expect(isPrismaKnownError({ code: 123 })).toBe(false));
});
