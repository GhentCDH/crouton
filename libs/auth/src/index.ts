export { AuthProviderSchema } from './lib/schema';
export type { AuthProviderConfig, RoleGuard } from './lib/schema';
export type {
  AuthAppInfo,
  AuthEndpointResponse,
  AuthProviderAdapter,
  AuthRequest,
  CroutonUser,
  LoadedProvider,
  PublicAuthConfig,
  PublicAuthProvider,
} from './lib/types';
export { defineAuthProvider } from './lib/types';
export { evaluateGuard } from './lib/guards';
export { buildPublicAuthConfig } from './lib/public-config';
