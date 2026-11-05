import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createOidcVerifier } from './verifier';

const ISSUER = 'https://test.issuer';
const CLIENT_ID = 'test-client';
const USERINFO_URL = 'https://test.issuer/userinfo';

const makeJwt = (payload: Record<string, unknown>) => {
  const header = btoa(JSON.stringify({ alg: 'RS256' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
};

const makeVerifier = () =>
  createOidcVerifier({
    issuer: ISSUER,
    clientId: CLIENT_ID,
    audience: CLIENT_ID,
    rolesClaim: 'roles',
    providerName: 'test',
    userinfoUrl: USERINFO_URL,
    config: { name: 'test', provider: 'oidc' },
  });

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('createOidcVerifier', () => {
  it('returns null when userinfo endpoint returns non-ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 }),
    );
    const token = makeJwt({ sub: 'u1' });
    expect(await makeVerifier()(token)).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    const token = makeJwt({ sub: 'u1' });
    expect(await makeVerifier()(token)).toBeNull();
  });

  it('maps claims from userinfo + jwt payload on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sub: 'u1', email: 'u@test.com' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const token = makeJwt({ sub: 'u1', roles: ['admin'] });
    const result = await makeVerifier()(token);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('u1');
  });

  it('calls userinfo with Bearer token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sub: 'u1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const token = makeJwt({ sub: 'u1' });
    await makeVerifier()(token);
    expect(fetchSpy).toHaveBeenCalledWith(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});
