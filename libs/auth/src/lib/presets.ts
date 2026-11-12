export type ProviderPreset = {
  issuer: (env: Record<string, string>) => string;
  jwksUrl: (env: Record<string, string>) => string;
  authorizationUrl: (env: Record<string, string>) => string;
  tokenUrl: (env: Record<string, string>) => string;
  userinfoUrl: (env: Record<string, string>) => string;
  rolesClaim: string;
  audience?: (env: Record<string, string>) => string | undefined;
  /** Issuer check for token verification when it differs from `issuer` (several accepted values, or a payload check). */
  verifyIssuer?: (env: Record<string, string>) => IssuerCheck;
};

/** Accepted `iss` value(s), or a predicate on the verified payload (for multi-tenant issuers). */
export type IssuerCheck = string | string[] | ((payload: Record<string, unknown>) => boolean);

const MS_MULTI_TENANT = ['common', 'organizations', 'consumers'];
const MS_LOGIN = 'https://login.microsoftonline.com';

/** Microsoft tenant: `tenant` env override, else MICROSOFT_TENANT, else `common`. */
export const microsoftTenant = (env: Record<string, string>): string =>
  env['tenant'] || process.env['MICROSOFT_TENANT'] || 'common';

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
    audience: (env) => env['clientId'],
    verifyIssuer: () => ['https://accounts.google.com', 'accounts.google.com'],
  },
  microsoft: {
    issuer: (env) => `${MS_LOGIN}/${microsoftTenant(env)}/v2.0`,
    jwksUrl: (env) => `${MS_LOGIN}/${microsoftTenant(env)}/discovery/v2.0/keys`,
    authorizationUrl: (env) => `${MS_LOGIN}/${microsoftTenant(env)}/oauth2/v2.0/authorize`,
    tokenUrl: (env) => `${MS_LOGIN}/${microsoftTenant(env)}/oauth2/v2.0/token`,
    userinfoUrl: () => 'https://graph.microsoft.com/v1.0/me',
    rolesClaim: 'roles',
    audience: (env) => env['clientId'],
    // Multi-tenant endpoints issue tokens with the user's own tenant in `iss`.
    verifyIssuer: (env) => {
      const tenant = microsoftTenant(env);
      return MS_MULTI_TENANT.includes(tenant)
        ? (p) => typeof p['tid'] === 'string' && p['iss'] === `${MS_LOGIN}/${p['tid']}/v2.0`
        : `${MS_LOGIN}/${tenant}/v2.0`;
    },
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
