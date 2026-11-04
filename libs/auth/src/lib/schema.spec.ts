import { describe, expect, it } from 'vitest';

import { AuthProviderSchema } from './schema';

const base = { name: 'kc', provider: 'keycloak' as const };

describe('AuthProviderSchema', () => {
  it('parses minimal valid config', () => {
    expect(() => AuthProviderSchema.parse(base)).not.toThrow();
  });

  it('accepts $schema optional', () => {
    expect(() => AuthProviderSchema.parse({ ...base, $schema: 'http://example.com' })).not.toThrow();
  });

  it('accepts default: true', () => {
    const r = AuthProviderSchema.parse({ ...base, default: true });
    expect(r.default).toBe(true);
  });

  it('rejects unknown provider', () => {
    expect(() => AuthProviderSchema.parse({ name: 'x', provider: 'ldap' })).toThrow();
  });

  it('requires name', () => {
    expect(() => AuthProviderSchema.parse({ provider: 'dev' })).toThrow();
  });

  it('requires provider', () => {
    expect(() => AuthProviderSchema.parse({ name: 'x' })).toThrow();
  });

  it('parses array guard shorthand', () => {
    const r = AuthProviderSchema.parse({ ...base, guards: { admin: ['admin'] } });
    expect(r.guards?.['admin']).toEqual(['admin']);
  });

  it('parses anyOf guard object', () => {
    const r = AuthProviderSchema.parse({ ...base, guards: { editor: { anyOf: ['editor', 'admin'] } } });
    expect(r.guards?.['editor']).toEqual({ anyOf: ['editor', 'admin'] });
  });

  it('parses allOf guard object', () => {
    const r = AuthProviderSchema.parse({ ...base, guards: { pub: { allOf: ['editor', 'reviewer'] } } });
    expect(r.guards?.['pub']).toEqual({ allOf: ['editor', 'reviewer'] });
  });

  it('accepts all provider values', () => {
    for (const provider of ['keycloak', 'auth0', 'google', 'microsoft', 'oidc', 'dev', 'custom'] as const) {
      expect(() => AuthProviderSchema.parse({ name: 'x', provider })).not.toThrow();
    }
  });
});
