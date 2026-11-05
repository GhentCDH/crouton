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
): CroutonUser => {
  let roles: string[] = [];

  if (rolesClaim) {
    const raw = getNestedClaim(claims, rolesClaim);
    if (Array.isArray(raw)) roles = raw.filter((r): r is string => typeof r === 'string');
  }

  if (config.provider === 'google' && config.roles?.byEmail) {
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
