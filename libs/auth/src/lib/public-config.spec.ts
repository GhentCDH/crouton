import { describe, expect, it } from 'vitest';

import { buildPublicAuthConfig } from './public-config';
import type { LoadedProvider } from './types';

const base: LoadedProvider = {
  config: { name: 'keycloak', provider: 'keycloak' },
  strategyName: 'keycloak',
  isDefault: true,
  issuer: 'https://auth.example.org/realms/crouton',
  clientId: 'crouton-admin',
};

describe('buildPublicAuthConfig', () => {
  it('returns provider with no secrets', () => {
    const result = buildPublicAuthConfig([base]);
    const p = result.providers[0];
    expect(p.clientId).toBe('crouton-admin');
    expect(p.issuer).toBe('https://auth.example.org/realms/crouton');
    expect((p as Record<string, unknown>)['clientSecret']).toBeUndefined();
  });

  it('omits scopes when not configured', () => {
    const result = buildPublicAuthConfig([base]);
    expect(result.providers[0].scopes).toBeUndefined();
  });

  it('surfaces scopes when configured', () => {
    const provider: LoadedProvider = {
      ...base,
      config: { ...base.config, scopes: ['openid', 'profile', 'email', 'offline_access'] },
    };
    const result = buildPublicAuthConfig([provider]);
    expect(result.providers[0].scopes).toEqual(['openid', 'profile', 'email', 'offline_access']);
  });

  it('marks default provider', () => {
    const result = buildPublicAuthConfig([base]);
    expect(result.providers[0].default).toBe(true);
  });

  it('sets isAuthenticated flag', () => {
    expect(buildPublicAuthConfig([base], true).isAuthenticated).toBe(true);
    expect(buildPublicAuthConfig([base], false).isAuthenticated).toBe(false);
  });
});
