export { AuthProviderSchema } from './lib/schema';
export type { AuthProviderConfig, RoleGuard } from './lib/schema';
export type {
  AuthEndpointResponse,
  AuthProviderAdapter,
  AuthRequest,
  CroutonUser,
  LoadedProvider,
  PublicAuthConfig,
} from './lib/types';
export { defineAuthProvider } from './lib/types';
export { evaluateGuard } from './lib/guards';
export { buildPublicAuthConfig } from './lib/public-config';
export { loadAuthProviders } from './lib/loader';
export { OAUTH2_ENV, getDefaultEnv, resolveEnv } from './lib/env';
export { createOidcVerifier } from './lib/verifier';
export { mapClaims } from './lib/claim-mapping';
export { PRESETS } from './lib/presets';
export type { ProviderPreset } from './lib/presets';
export type { VerifierOptions } from './lib/verifier';
