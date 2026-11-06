import { createRemoteJWKSet, jwtVerify } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createOidcVerifier } from './verifier';

vi.mock('jose', () => {
  const mockJwks = vi.fn();
  return {
    createRemoteJWKSet: vi.fn(() => mockJwks),
    jwtVerify: vi.fn(),
  };
});

const ISSUER = 'https://test.issuer';
const CLIENT_ID = 'test-client';
const JWKS_URL = 'https://test.issuer/.well-known/jwks.json';

const makeVerifier = (audience?: string) =>
  createOidcVerifier({
    issuer: ISSUER,
    clientId: CLIENT_ID,
    audience,
    rolesClaim: 'roles',
    providerName: 'test',
    jwksUrl: JWKS_URL,
    config: { name: 'test', provider: 'oidc' },
  });

beforeEach(() => {
  vi.mocked(jwtVerify).mockReset();
  vi.mocked(createRemoteJWKSet).mockClear();
});

describe('createOidcVerifier', () => {
  it('returns CroutonUser on valid token', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { sub: 'u1', email: 'u@test.com', roles: ['admin'] },
    } as never);
    const result = await makeVerifier()(  'token');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('u1');
    expect(result?.email).toBe('u@test.com');
    expect(result?.roles).toEqual(['admin']);
  });

  it('returns null when jwtVerify throws', async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error('invalid signature'));
    expect(await makeVerifier()('bad-token')).toBeNull();
  });

  it('passes audience to jwtVerify when configured', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'u1' } } as never);
    await makeVerifier(CLIENT_ID)('token');
    expect(vi.mocked(jwtVerify)).toHaveBeenCalledWith(
      'token',
      expect.anything(),
      expect.objectContaining({ audience: CLIENT_ID }),
    );
  });

  it('omits audience from jwtVerify when not configured', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'u1' } } as never);
    await makeVerifier()('token');
    const callOpts = vi.mocked(jwtVerify).mock.calls[0]?.[2] as Record<string, unknown>;
    expect(callOpts).not.toHaveProperty('audience');
  });

  it('reuses same JWKS set for same URL', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'u1' } } as never);
    const freshUrl = 'https://unique-caching-test.example/.well-known/jwks.json';
    const makeWithUrl = () =>
      createOidcVerifier({
        issuer: ISSUER,
        clientId: CLIENT_ID,
        rolesClaim: 'roles',
        providerName: 'test',
        jwksUrl: freshUrl,
        config: { name: 'test', provider: 'oidc' },
      });
    const v1 = makeWithUrl();
    const v2 = makeWithUrl();
    await v1('t1');
    await v2('t2');
    const callsForUrl = vi.mocked(createRemoteJWKSet).mock.calls.filter(
      (c) => (c[0] as URL).href === freshUrl,
    );
    expect(callsForUrl).toHaveLength(1);
  });
});
