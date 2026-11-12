import type { AuthAppInfo, AuthEndpointResponse, LoadedProvider, PublicAuthConfig } from './types';

const providerClientConfig = (p: LoadedProvider): PublicAuthConfig =>
  p.adapter?.clientConfig?.() ?? {
    provider: p.config.provider,
    issuer: p.issuer,
    clientId: p.clientId,
    ...(p.config.scopes ? { scopes: p.config.scopes } : {}),
    rolesClaim: p.rolesClaim,
  };

export const buildPublicAuthConfig = (
  providers: LoadedProvider[],
  isAuthenticated = false,
  app?: AuthAppInfo,
): AuthEndpointResponse => ({
  isAuthenticated,
  providers: providers.map((p) => ({
    id: p.strategyName,
    name: p.config.name,
    default: p.isDefault,
    loginMode: p.hasOAuth2 ? 'server' : 'browser',
    ...providerClientConfig(p),
  })),
  ...(app ? { app } : {}),
});
