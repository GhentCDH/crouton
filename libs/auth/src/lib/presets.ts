export type ProviderPreset = {
  issuer: (env: Record<string, string>) => string;
  jwksUrl: (env: Record<string, string>) => string;
  authorizationUrl: (env: Record<string, string>) => string;
  tokenUrl: (env: Record<string, string>) => string;
  userinfoUrl: (env: Record<string, string>) => string;
  rolesClaim: string;
  audience?: (env: Record<string, string>) => string | undefined;
};

export const PRESETS: Record<string, ProviderPreset> = {
  keycloak: {
    issuer: (env) => `${env['url'].replace(/\/$/, '')}/realms/${env['realm']}`,
    jwksUrl: (env) => `${env['url'].replace(/\/$/, '')}/realms/${env['realm']}/protocol/openid-connect/certs`,
    authorizationUrl: (env) => `${env['url'].replace(/\/$/, '')}/realms/${env['realm']}/protocol/openid-connect/auth`,
    tokenUrl: (env) => `${env['url'].replace(/\/$/, '')}/realms/${env['realm']}/protocol/openid-connect/token`,
    userinfoUrl: (env) => `${env['url'].replace(/\/$/, '')}/realms/${env['realm']}/protocol/openid-connect/userinfo`,
    rolesClaim: 'realm_access.roles',
  },
  auth0: {
    issuer: (env) => `https://${env['domain']}/`,
    jwksUrl: (env) => `https://${env['domain']}/.well-known/jwks.json`,
    authorizationUrl: (env) => `https://${env['domain']}/authorize`,
    tokenUrl: (env) => `https://${env['domain']}/oauth/token`,
    userinfoUrl: (env) => `https://${env['domain']}/userinfo`,
    rolesClaim: 'permissions',
    audience: (env) => env['audience'],
  },
  google: {
    issuer: () => 'https://accounts.google.com',
    jwksUrl: () => 'https://www.googleapis.com/oauth2/v3/certs',
    authorizationUrl: () => 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: () => 'https://oauth2.googleapis.com/token',
    userinfoUrl: () => 'https://www.googleapis.com/oauth2/v3/userinfo',
    rolesClaim: '',
  },
  microsoft: {
    issuer: () => 'https://login.microsoftonline.com/common/v2.0',
    jwksUrl: () => 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
    authorizationUrl: () => 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: () => 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userinfoUrl: () => 'https://graph.microsoft.com/v1.0/me',
    rolesClaim: '',
  },
  oidc: {
    issuer: (env) => env['issuer'] ?? '',
    jwksUrl: (env) => `${env['issuer']}/.well-known/jwks.json`,
    authorizationUrl: (env) => `${env['issuer']}/protocol/openid-connect/auth`,
    tokenUrl: (env) => `${env['issuer']}/protocol/openid-connect/token`,
    userinfoUrl: (env) => env['userinfoUrl'] ?? `${env['issuer']}/protocol/openid-connect/userinfo`,
    rolesClaim: 'roles',
    audience: (env) => env['audience'],
  },
};
