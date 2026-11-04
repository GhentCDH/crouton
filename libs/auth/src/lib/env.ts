export const resolveEnv = (
  envMap: Record<string, string>,
  source: NodeJS.ProcessEnv = process.env,
): Record<string, string> => {
  const missing: string[] = [];
  const resolved: Record<string, string> = {};
  for (const [key, envVar] of Object.entries(envMap)) {
    const val = source[envVar];
    if (!val) missing.push(envVar);
    else resolved[key] = val;
  }
  if (missing.length) throw new Error(`Auth provider: missing env vars: ${missing.join(', ')}`);
  return resolved;
};

const DEFAULT_ENV: Record<string, Record<string, string>> = {
  oidc: { issuer: 'OIDC_ISSUER', clientId: 'OIDC_CLIENT_ID', audience: 'OIDC_AUDIENCE' },
  keycloak: { url: 'KEYCLOAK_URL', realm: 'KEYCLOAK_REALM', clientId: 'KEYCLOAK_CLIENT_ID' },
  auth0: { domain: 'AUTH0_DOMAIN', clientId: 'AUTH0_CLIENT_ID', audience: 'AUTH0_AUDIENCE' },
  google: { clientId: 'GOOGLE_CLIENT_ID' },
  dev: { token: 'CROUTON_DEV_TOKEN' },
};

export const getDefaultEnv = (provider: string): Record<string, string> =>
  DEFAULT_ENV[provider] ?? {};
