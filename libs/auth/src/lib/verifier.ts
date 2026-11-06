import { createRemoteJWKSet, jwtVerify } from 'jose';

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
  jwksUrl: string;
};

const jwksSets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export const createOidcVerifier = (opts: VerifierOptions) => {
  let jwks = jwksSets.get(opts.jwksUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(opts.jwksUrl));
    jwksSets.set(opts.jwksUrl, jwks);
  }

  return async (token: string): Promise<CroutonUser | null> => {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: opts.issuer,
        ...(opts.audience ? { audience: opts.audience } : {}),
      });
      return mapClaims(payload as Record<string, unknown>, opts.config, opts.rolesClaim, opts.providerName, opts.clientId);
    } catch {
      return null;
    }
  };
};
