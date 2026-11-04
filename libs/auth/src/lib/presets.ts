export type ProviderPreset = {
  issuer: (env: Record<string, string>) => string;
  userinfoUrl: (env: Record<string, string>) => string;
  rolesClaim: string;
  audience?: (env: Record<string, string>) => string | undefined;
};

export const PRESETS: Record<string, ProviderPreset> = {
  keycloak: {
    issuer: (env) => `${env['url'].replace(/\/$/, '')}/realms/${env['realm']}`,
    userinfoUrl: (env) => `${env['url'].replace(/\/$/, '')}/realms/${env['realm']}/protocol/openid-connect/userinfo`,
    rolesClaim: 'realm_access.roles',
  },
  auth0: {
    issuer: (env) => `https://${env['domain']}/`,
    userinfoUrl: (env) => `https://${env['domain']}/userinfo`,
    rolesClaim: 'permissions',
    audience: (env) => env['audience'],
  },
  google: {
    issuer: () => 'https://accounts.google.com',
    userinfoUrl: () => 'https://www.googleapis.com/oauth2/v3/userinfo',
    rolesClaim: '',
  },
  oidc: {
    issuer: (env) => env['issuer'] ?? '',
    userinfoUrl: (env) => env['userinfoUrl'] ?? '',
    rolesClaim: 'roles',
    audience: (env) => env['audience'],
  },
};
