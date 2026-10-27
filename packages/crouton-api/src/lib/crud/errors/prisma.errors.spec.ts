import { describe, expect, it } from 'vitest';

import { isPrismaKnownError } from './prisma.errors';

describe('isPrismaKnownError', () => {
  it('true for object with string code', () =>
    expect(isPrismaKnownError({ code: 'P2002', message: 'x' })).toBe(true));
  it('false for Error without code', () =>
    expect(isPrismaKnownError(new Error('x'))).toBe(false));
  it('false for null', () => expect(isPrismaKnownError(null)).toBe(false));
  it('false when code is not string', () =>
    expect(isPrismaKnownError({ code: 123 })).toBe(false));
});
