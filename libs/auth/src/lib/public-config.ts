import type { AuthEndpointResponse, LoadedProvider } from './types';

export const buildPublicAuthConfig = (
  providers: LoadedProvider[],
  isAuthenticated = false,
): AuthEndpointResponse => ({
  isAuthenticated,
  providers: providers.map((p) => ({
    name: p.config.name,
    default: p.isDefault,
    ...(p.adapter.clientConfig?.() ?? { provider: p.config.provider }),
  })),
});
