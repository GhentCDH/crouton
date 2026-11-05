import type { AuthEndpointResponse, LoadedProvider, PublicAuthConfig } from './types';

const providerClientConfig = (p: LoadedProvider): PublicAuthConfig =>
  p.adapter?.clientConfig?.() ?? {
    provider: p.config.provider,
    issuer: p.issuer,
    clientId: p.clientId,
    rolesClaim: p.rolesClaim,
  };

export const buildPublicAuthConfig = (
  providers: LoadedProvider[],
  isAuthenticated = false,
): AuthEndpointResponse => ({
  isAuthenticated,
  providers: providers.map((p) => ({
    name: p.config.name,
    default: p.isDefault,
    ...providerClientConfig(p),
  })),
});
