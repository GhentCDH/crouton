import { describe, expect, it } from 'vitest';

import { mapClaims } from './claim-mapping';
import type { AuthProviderConfig } from './schema';

const kcConfig: AuthProviderConfig = { name: 'kc', provider: 'keycloak' };
const googleConfig: AuthProviderConfig = { name: 'g', provider: 'google' };

describe('mapClaims', () => {
  it('maps sub → id, email, name', () => {
    const user = mapClaims({ sub: 'u1', email: 'a@b.com', name: 'Alice' }, kcConfig, 'roles', 'kc');
    expect(user).toMatchObject({ id: 'u1', email: 'a@b.com', name: 'Alice', provider: 'kc' });
  });

  it('id is empty string when sub missing', () => {
    expect(mapClaims({}, kcConfig, 'roles', 'kc').id).toBe('');
  });

  it('email and name undefined when absent', () => {
    const user = mapClaims({ sub: 'u1' }, kcConfig, 'roles', 'kc');
    expect(user.email).toBeUndefined();
    expect(user.name).toBeUndefined();
  });

  it('extracts roles from flat claim', () => {
    const user = mapClaims({ sub: 'u1', roles: ['admin', 'editor'] }, kcConfig, 'roles', 'kc');
    expect(user.roles).toEqual(['admin', 'editor']);
  });

  it('extracts roles from nested Keycloak claim', () => {
    const user = mapClaims(
      { sub: 'u1', realm_access: { roles: ['admin'] } },
      kcConfig,
      'realm_access.roles',
      'kc',
    );
    expect(user.roles).toEqual(['admin']);
  });

  it('ignores non-array role claim', () => {
    const user = mapClaims({ sub: 'u1', roles: 'admin' }, kcConfig, 'roles', 'kc');
    expect(user.roles).toEqual([]);
  });

  it('returns empty roles for unknown claim path', () => {
    const user = mapClaims({ sub: 'u1' }, kcConfig, 'no.such.path', 'kc');
    expect(user.roles).toEqual([]);
  });

  it('empty rolesClaim → no role extraction', () => {
    const user = mapClaims({ sub: 'u1', roles: ['admin'] }, kcConfig, '', 'kc');
    expect(user.roles).toEqual([]);
  });

  it('google: maps roles by email', () => {
    const config: AuthProviderConfig = {
      ...googleConfig,
      roles: { byEmail: { admin: ['alice@example.com'] } },
    };
    const user = mapClaims({ sub: 'u1', email: 'alice@example.com' }, config, '', 'g');
    expect(user.roles).toContain('admin');
  });

  it('google: email not in byEmail → no roles', () => {
    const config: AuthProviderConfig = {
      ...googleConfig,
      roles: { byEmail: { admin: ['other@example.com'] } },
    };
    const user = mapClaims({ sub: 'u1', email: 'alice@example.com' }, config, '', 'g');
    expect(user.roles).toEqual([]);
  });
});
