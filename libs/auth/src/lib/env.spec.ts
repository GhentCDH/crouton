import { describe, expect, it } from 'vitest';

import { getDefaultEnv, resolveEnv } from './env';

describe('resolveEnv', () => {
  it('resolves env var names to values', () => {
    const result = resolveEnv({ url: 'HOME' }, process.env);
    expect(result['url']).toBe(process.env['HOME']);
  });

  it('throws when a var is missing', () => {
    expect(() => resolveEnv({ x: 'CROUTON_MISSING_XYZ_99' }, {})).toThrow('CROUTON_MISSING_XYZ_99');
  });

  it('aggregates all missing vars in one error', () => {
    expect(() => resolveEnv({ a: 'MISSING_A', b: 'MISSING_B' }, {})).toThrow(/MISSING_A.*MISSING_B|MISSING_B.*MISSING_A/);
  });

  it('resolves multiple vars', () => {
    const result = resolveEnv({ x: 'X_VAR', y: 'Y_VAR' }, { X_VAR: 'hello', Y_VAR: 'world' });
    expect(result).toEqual({ x: 'hello', y: 'world' });
  });
});

describe('getDefaultEnv', () => {
  it('returns keycloak env names', () => {
    expect(getDefaultEnv('keycloak')).toEqual({
      url: 'KEYCLOAK_URL',
      realm: 'KEYCLOAK_REALM',
      clientId: 'KEYCLOAK_CLIENT_ID',
    });
  });

  it('returns oidc env names', () => {
    expect(getDefaultEnv('oidc')).toEqual({
      issuer: 'OIDC_ISSUER',
      clientId: 'OIDC_CLIENT_ID',
      audience: 'OIDC_AUDIENCE',
    });
  });

  it('returns dev env names', () => {
    expect(getDefaultEnv('dev')).toEqual({ token: 'CROUTON_DEV_TOKEN' });
  });

  it('returns empty object for unknown provider', () => {
    expect(getDefaultEnv('unknown')).toEqual({});
  });
});
