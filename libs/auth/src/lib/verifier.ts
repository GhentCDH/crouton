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
  userinfoUrl: string;
};

export const createOidcVerifier = (opts: VerifierOptions) => {
  return async (token: string): Promise<CroutonUser | null> => {
    if (!opts.userinfoUrl) return null;
    try {
      // Validate token by calling the userinfo endpoint — provider does the
      // signature/expiry check for us, no local JWKS needed.
      const res = await fetch(opts.userinfoUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const userinfo = await res.json() as Record<string, unknown>;

      // Decode JWT payload (no sig verification — userinfo call proved validity).
      // JWT payload carries claims like realm_access.roles that userinfo omits.
      const jwtPayload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString(),
      ) as Record<string, unknown>;

      return mapClaims({ ...jwtPayload, ...userinfo }, opts.config, opts.rolesClaim, opts.providerName);
    } catch {
      return null;
    }
  };
};
