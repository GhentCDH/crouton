import type * as JoseModule from 'jose';
import { type KeyLike, SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createOidcVerifier } from './verifier';

// Intercept the dynamic import('jose') inside verifier so createRemoteJWKSet
// returns a local JWKS instead of fetching from a URL.
const localJwks = { fn: null as ReturnType<typeof createLocalJWKSet> | null };

vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<JoseModule>();
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createRemoteJWKSet: (_: URL) => (req: Parameters<ReturnType<typeof createLocalJWKSet>>[0], opts: Parameters<ReturnType<typeof createLocalJWKSet>>[1]) => {
      const fn = localJwks.fn;
      if (!fn) throw new Error('localJwks not initialised');
      return fn(req, opts);
    },
  };
});

const ISSUER = 'https://test.issuer';
const CLIENT_ID = 'test-client';

let privateKey: KeyLike;

const sign = async (
  payload: Record<string, unknown>,
  opts: { issuer?: string; expiresIn?: string; audience?: string } = {},
) =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(opts.issuer ?? ISSUER)
    .setAudience(opts.audience ?? CLIENT_ID)
    .setExpirationTime(opts.expiresIn ?? '1h')
    .setSubject(String(payload['sub'] ?? 'test-sub'))
    .sign(privateKey);

beforeAll(async () => {
  const { privateKey: priv, publicKey } = await generateKeyPair('RS256');
  privateKey = priv;
  const jwk = await exportJWK(publicKey);
  localJwks.fn = createLocalJWKSet({ keys: [{ ...jwk, kid: 'test-key', use: 'sig', alg: 'RS256' }] });
});

const makeVerifier = () =>
  createOidcVerifier({
    issuer: ISSUER,
    clientId: CLIENT_ID,
    audience: CLIENT_ID,
    rolesClaim: 'roles',
    providerName: 'test',
    config: { name: 'test', provider: 'oidc' },
  });

describe('createOidcVerifier', () => {
  it('returns CroutonUser for valid token', async () => {
    const token = await sign({ sub: 'u1', email: 'a@b.com', roles: ['admin'] });
    const verify = makeVerifier();
    const user = await verify(token);
    expect(user).toMatchObject({ id: 'u1', email: 'a@b.com', roles: ['admin'], provider: 'test' });
  });

  it('returns null for wrong issuer', async () => {
    const token = await sign({ sub: 'u1' }, { issuer: 'https://evil.issuer' });
    expect(await makeVerifier()(token)).toBeNull();
  });

  it('returns null for invalid signature (tampered token)', async () => {
    const token = await sign({ sub: 'u1' });
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(await makeVerifier()(tampered)).toBeNull();
  });

  it('returns null for expired token', async () => {
    const token = await sign({ sub: 'u1' }, { expiresIn: '0s' });
    // Give the token a moment to expire
    await new Promise((r) => setTimeout(r, 10));
    expect(await makeVerifier()(token)).toBeNull();
  });

  describe('adapter.authenticate', () => {
    it('returns null when no Authorization header', async () => {
      const adapter = {
        authenticate: async (req: { headers: Record<string, string | undefined> }) => {
          const auth = req.headers['authorization'];
          if (!auth?.startsWith('Bearer ')) return null;
          return makeVerifier()(auth.slice(7));
        },
      };
      expect(await adapter.authenticate({ headers: {} })).toBeNull();
    });

    it('returns user for valid Bearer token', async () => {
      const token = await sign({ sub: 'u2' });
      const adapter = {
        authenticate: async (req: { headers: Record<string, string | undefined> }) => {
          const auth = req.headers['authorization'];
          if (!auth?.startsWith('Bearer ')) return null;
          return makeVerifier()(auth.slice(7));
        },
      };
      const user = await adapter.authenticate({ headers: { authorization: `Bearer ${token}` } });
      expect(user?.id).toBe('u2');
    });
  });
});
