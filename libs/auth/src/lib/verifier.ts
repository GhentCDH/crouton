import { createRemoteJWKSet, jwtVerify } from 'jose';

import { isAllowedDomain, mapClaims } from './claim-mapping';
import type { IssuerCheck } from './presets';
import type { AuthProviderConfig } from './schema';
import type { CroutonUser } from './types';

export type VerifierOptions = {
  issuer: IssuerCheck;
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
  const issuerCheck = typeof opts.issuer === 'function' ? opts.issuer : undefined;

  return async (token: string): Promise<CroutonUser | null> => {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        ...(issuerCheck ? {} : { issuer: opts.issuer as string | string[] }),
        ...(opts.audience ? { audience: opts.audience } : {}),
      });
      const claims = payload as Record<string, unknown>;
      if (issuerCheck && !issuerCheck(claims)) return null;
      if (!isAllowedDomain(claims, opts.config)) return null;
      return mapClaims(claims, opts.config, opts.rolesClaim, opts.providerName, opts.clientId);
    } catch {
      return null;
    }
  };
};
