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

export type AuthProviderAdapter = {
  authenticate: (req: AuthRequest) => Promise<CroutonUser | null>;
  clientConfig?: () => PublicAuthConfig;
};

export type LoadedProvider = {
  config: AuthProviderConfig;
  adapter: AuthProviderAdapter;
  isDefault: boolean;
  issuer?: string;
};

export type AuthEndpointResponse = {
  providers: Array<PublicAuthConfig & { name: string; default: boolean }>;
};

export const defineAuthProvider = (adapter: AuthProviderAdapter): AuthProviderAdapter => adapter;
