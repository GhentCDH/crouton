import { describe, expect, it } from 'vitest';

import { readEnv } from './env';

describe('readEnv', () => {
  it('reads from process.env', () => {
    process.env['CROUTON_TEST_VAR'] = 'hello';
    expect(readEnv('CROUTON_TEST_VAR')).toBe('hello');
    delete process.env['CROUTON_TEST_VAR'];
  });

  it('returns undefined for missing key', () => {
    expect(readEnv('CROUTON_MISSING_XYZ_12345')).toBeUndefined();
  });
});
