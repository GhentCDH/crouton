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
  /** Set only for `custom` providers. */
  adapter?: AuthProviderAdapter;
};

export type AuthEndpointResponse = {
  isAuthenticated: boolean;
  providers: Array<PublicAuthConfig & { name: string; default: boolean }>;
};

export const defineAuthProvider = (adapter: AuthProviderAdapter): AuthProviderAdapter => adapter;
