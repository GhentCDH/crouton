import { describe, expect, it } from 'vitest';

import { PRESETS } from './presets';

const MS = 'https://login.microsoftonline.com';
const ms = PRESETS['microsoft'];

describe('microsoft preset', () => {
  it('multi-tenant: accepts iss matching the token tid, rejects others', () => {
    const check = ms.verifyIssuer?.({ clientId: 'c' }) as (p: Record<string, unknown>) => boolean;
    expect(typeof check).toBe('function');
    expect(check({ tid: 'abc', iss: `${MS}/abc/v2.0` })).toBe(true);
    expect(check({ tid: 'abc', iss: `${MS}/evil/v2.0` })).toBe(false);
    expect(check({ iss: `${MS}/undefined/v2.0` })).toBe(false);
  });

  it('specific tenant: exact issuer and tenant URLs', () => {
    const env = { clientId: 'c', tenant: 't1' };
    expect(ms.verifyIssuer?.(env)).toBe(`${MS}/t1/v2.0`);
    expect(ms.authorizationUrl(env)).toBe(`${MS}/t1/oauth2/v2.0/authorize`);
    expect(ms.audience?.(env)).toBe('c');
  });
});

describe('google preset', () => {
  it('checks audience and both issuer forms', () => {
    expect(PRESETS['google'].audience?.({ clientId: 'c' })).toBe('c');
    expect(PRESETS['google'].verifyIssuer?.({})).toEqual(['https://accounts.google.com', 'accounts.google.com']);
  });
});
