import { SignJWT, jwtVerify } from 'jose';

import type { CroutonUser } from './types';

const ISSUER = 'crouton';
const enc = (secret: string) => new TextEncoder().encode(secret);

/** Secret for crouton-signed session JWTs (`CROUTON_AUTH_SECRET`); undefined when unset. */
export const getSessionSecret = (): string | undefined => process.env['CROUTON_AUTH_SECRET'] || undefined;

/** Session lifetime (`CROUTON_SESSION_TTL`, jose time span such as `8h`). Default `8h`. */
export const getSessionTtl = (): string => process.env['CROUTON_SESSION_TTL'] || '8h';

/** Signs a session JWT for a user verified at login. Roles are baked in: role changes need a re-login. */
export const signSession = (user: CroutonUser, secret: string, ttl = getSessionTtl()): Promise<string> =>
  new SignJWT({ email: user.email, name: user.name, roles: user.roles, provider: user.provider })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(ISSUER)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(enc(secret));

export const verifySession = async (token: string, secret: string): Promise<CroutonUser | null> => {
  try {
    const { payload } = await jwtVerify(token, enc(secret), { issuer: ISSUER, audience: ISSUER, algorithms: ['HS256'] });
    return {
      id: String(payload.sub ?? ''),
      email: typeof payload['email'] === 'string' ? payload['email'] : undefined,
      name: typeof payload['name'] === 'string' ? payload['name'] : undefined,
      roles: Array.isArray(payload['roles']) ? payload['roles'].filter((r): r is string => typeof r === 'string') : [],
      provider: String(payload['provider'] ?? ''),
      claims: payload as Record<string, unknown>,
    };
  } catch {
    return null;
  }
};
