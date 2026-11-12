import type { AuthProviderConfig } from './schema';

export type CroutonUser = {
  id: string;
  email?: string;
  name?: string;
  roles: string[];
  provider: string;
  claims: Record<string, unknown>;
};

export type AuthRequest = {
  headers: Record<string, string | string[] | undefined>;
};

export type PublicAuthConfig = {
  provider: string;
  issuer?: string;
  clientId?: string;
  scopes?: string[];
  rolesClaim?: string;
  extra?: Record<string, unknown>;
};

/** Only used for the `custom` provider type. */
export type AuthProviderAdapter = {
  authenticate: (req: AuthRequest) => Promise<CroutonUser | null>;
  clientConfig?: () => PublicAuthConfig;
};

export type LoadedProvider = {
  config: AuthProviderConfig;
  /** Passport strategy name registered for this provider (= the provider directory name). */
  strategyName: string;
  isDefault: boolean;
  issuer?: string;
  clientId?: string;
  rolesClaim?: string;
  jwksUrl?: string;
  /** True when the OAuth2 login env (client secret + callback URL) is configured → server-side login. */
  hasOAuth2?: boolean;
  /** Set only for `custom` providers. */
  adapter?: AuthProviderAdapter;
};

export type PublicAuthProvider = PublicAuthConfig & {
  /** Provider directory name — used in `/_app/auth/:id/login`. */
  id: string;
  name: string;
  default: boolean;
  /** `server`: backend OAuth2 flow issuing a crouton session JWT. `browser`: OIDC PKCE in the browser. */
  loginMode: 'server' | 'browser';
};

export type AuthAppInfo = { title?: string; logo?: string };

export type AuthEndpointResponse = {
  isAuthenticated: boolean;
  providers: PublicAuthProvider[];
  app?: AuthAppInfo;
};

export const defineAuthProvider = (adapter: AuthProviderAdapter): AuthProviderAdapter => adapter;
