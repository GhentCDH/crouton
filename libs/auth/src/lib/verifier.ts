import { mapClaims } from './claim-mapping';
import type { AuthProviderConfig } from './schema';
import type { CroutonUser } from './types';

export type VerifierOptions = {
  issuer: string;
  clientId: string;
  audience?: string;
  rolesClaim: string;
  providerName: string;
  config: AuthProviderConfig;
};

export const createOidcVerifier = (opts: VerifierOptions) => {
  // ponytail: lazy singleton JWKS, no cache invalidation — add expiry if JWKS rotation is needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jwks: any = null;

  const getJwks = async () => {
    if (!jwks) {
      const { createRemoteJWKSet } = await import('jose');
      const issuer = opts.issuer.replace(/\/$/, '');
      jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    }
    return jwks;
  };

  return async (token: string): Promise<CroutonUser | null> => {
    try {
      const { jwtVerify } = await import('jose');
      const jwksFunc = await getJwks();
      const { payload } = await jwtVerify(token, jwksFunc, {
        issuer: opts.issuer,
        audience: opts.audience ?? opts.clientId,
      });
      return mapClaims(payload as Record<string, unknown>, opts.config, opts.rolesClaim, opts.providerName);
    } catch {
      return null;
    }
  };
};
