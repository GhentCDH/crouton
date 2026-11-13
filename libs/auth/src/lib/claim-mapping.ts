import type { AuthProviderConfig } from './schema';
import type { CroutonUser } from './types';

const getNestedClaim = (claims: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((obj, key) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
    return undefined;
  }, claims);

export const mapClaims = (
  claims: Record<string, unknown>,
  config: AuthProviderConfig,
  rolesClaim: string,
  providerName: string,
  clientId?: string,
): CroutonUser => {
  let roles: string[] = [];

  if (rolesClaim) {
    const raw = getNestedClaim(claims, rolesClaim);
    if (Array.isArray(raw)) roles = raw.filter((r): r is string => typeof r === 'string');
  }

  if (config.provider === 'keycloak' && clientId) {
    const resourceAccess = claims['resource_access'] as Record<string, unknown> | undefined;
    const clientRoles = (resourceAccess?.[clientId] as Record<string, unknown> | undefined)?.['roles'];
    if (Array.isArray(clientRoles)) {
      roles.push(...clientRoles.filter((r): r is string => typeof r === 'string' && !roles.includes(r)));
    }
  }

  if (config.roles?.byEmail) {
    const email = String(claims['email'] ?? '');
    for (const [role, emails] of Object.entries(config.roles.byEmail)) {
      if (emails.includes(email)) roles.push(role);
    }
  }

  return {
    id: String(claims['sub'] ?? ''),
    email: claims['email'] ? String(claims['email']) : undefined,
    name: claims['name'] ? String(claims['name']) : undefined,
    roles,
    provider: providerName,
    claims,
  };
};

/**
 * `roles.allowedDomains` gate: when set, the email domain must be listed and the
 * email must not be explicitly unverified (`email_verified: false`).
 */
export const isAllowedDomain = (claims: Record<string, unknown>, config: AuthProviderConfig): boolean => {
  const domains = config.roles?.allowedDomains;
  if (!domains?.length) return true;
  if (claims['email_verified'] === false) return false;
  const domain = String(claims['email'] ?? '').split('@')[1]?.toLowerCase();
  return !!domain && domains.some((d) => d.toLowerCase() === domain);
};
