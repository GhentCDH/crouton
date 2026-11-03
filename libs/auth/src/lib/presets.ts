export type ProviderPreset = {
  issuer: (env: Record<string, string>) => string;
  rolesClaim: string;
  audience?: (env: Record<string, string>) => string | undefined;
};

export const PRESETS: Record<string, ProviderPreset> = {
  keycloak: {
    issuer: (env) => `${env['url']}/realms/${env['realm']}`,
    rolesClaim: 'realm_access.roles',
  },
  auth0: {
    issuer: (env) => `https://${env['domain']}/`,
    rolesClaim: 'permissions',
    audience: (env) => env['audience'],
  },
  google: {
    issuer: () => 'https://accounts.google.com',
    rolesClaim: '',
  },
  oidc: {
    issuer: (env) => env['issuer'] ?? '',
    rolesClaim: 'roles',
    audience: (env) => env['audience'],
  },
};
