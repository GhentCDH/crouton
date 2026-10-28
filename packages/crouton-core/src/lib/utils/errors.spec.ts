import { describe, expect, it } from 'vitest';

import { errorMessage } from './errors';

describe('errorMessage', () => {
  it('returns message from Error', () =>
    expect(errorMessage(new Error('oops'))).toBe('oops'));
  it('returns string as-is', () => expect(errorMessage('bad')).toBe('bad'));
  it('converts number', () => expect(errorMessage(42)).toBe('42'));
  it('converts null', () => expect(errorMessage(null)).toBe('null'));
});
