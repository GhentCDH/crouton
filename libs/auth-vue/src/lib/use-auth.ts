import type { AuthAppInfo, CroutonUser, PublicAuthProvider } from '@crouton/auth';
import { type User, UserManager, type UserManagerSettings, WebStorageStateStore } from 'oidc-client-ts';
import { type Ref, computed, ref } from 'vue';

const SESSION_KEY = 'crouton.session';
const PROVIDER_KEY = 'crouton.auth.provider';
export const LOGIN_PATH = '/auth/login';
export const CALLBACK_PATH = '/auth/callback';

let manager: UserManager | null = null;
const oidcUser: Ref<User | null> = ref(null);
let configuredRolesClaim = 'roles';

const storage = {
  get: (key: string): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string | null) => {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // Storage unavailable (private mode) — session lives only in memory.
    }
  },
};

/** Crouton-signed session JWT (server-side login flow). */
const sessionToken = ref<string | null>(typeof window === 'undefined' ? null : storage.get(SESSION_KEY));
/** Providers + app info from `GET /_app/auth`, set by setupAuth(). */
const providers = ref<PublicAuthProvider[]>([]);
const appInfo = ref<AuthAppInfo>({});
/** Prefix for server-login URLs (axios baseURL + apiBase). */
let loginBase = '';

const decodePayload = (token: string): Record<string, unknown> | null => {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/** Session payload, or null when absent/expired. Expiry is evaluated at call time. */
const validSession = (): Record<string, unknown> | null => {
  const token = sessionToken.value;
  const payload = token ? decodePayload(token) : null;
  if (!payload || typeof payload['exp'] !== 'number' || payload['exp'] * 1000 <= Date.now()) return null;
  return payload;
};

const getNestedClaim = (profile: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((obj, key) => {
    if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
    return undefined;
  }, profile);

export const setupOidcManager = (settings: UserManagerSettings, rolesClaim?: string) => {
  if (rolesClaim) configuredRolesClaim = rolesClaim;
  manager = new UserManager(settings);
  manager.events.addUserLoaded((u) => {
    oidcUser.value = u;
  });
  manager.events.addUserUnloaded(() => {
    oidcUser.value = null;
  });
  manager.events.addSilentRenewError((e) => console.warn('[crouton-auth] silent renew error', e));
};

/** Configures the OIDC (browser PKCE) manager for a provider. Returns false when it can't do browser login. */
export const setupBrowserProvider = (p: PublicAuthProvider): boolean => {
  if (!p.issuer || !p.clientId) return false;
  setupOidcManager(
    {
      authority: p.issuer,
      client_id: p.clientId,
      redirect_uri: `${window.location.origin}${CALLBACK_PATH}`,
      scope: (p.scopes ?? ['openid', 'profile', 'email']).join(' '),
      automaticSilentRenew: true,
      revokeTokensOnSignout: true,
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      accessTokenExpiringNotificationTimeInSeconds: 60,
    },
    p.rolesClaim,
  );
  return true;
};

export const setAuthProviders = (list: PublicAuthProvider[], app: AuthAppInfo | undefined, base: string) => {
  providers.value = list;
  appInfo.value = app ?? {};
  loginBase = base;
};

/** Browser-mode provider remembered from the last choice, else the default/first browser-mode provider. */
export const pickBrowserProvider = (): PublicAuthProvider | undefined => {
  const browser = providers.value.filter((p) => p.loginMode === 'browser' && p.issuer && p.clientId);
  const stored = storage.get(PROVIDER_KEY);
  return browser.find((p) => p.id === stored) ?? browser.find((p) => p.default) ?? browser[0];
};

/** Stores the session JWT returned in the `/auth/callback#token=…` fragment. */
export const setSessionToken = (token: string | null) => {
  sessionToken.value = token;
  storage.set(SESSION_KEY, token);
};

const loginWith = async (p: PublicAuthProvider) => {
  storage.set(PROVIDER_KEY, p.id);
  if (p.loginMode === 'server') {
    window.location.href = `${loginBase}/_app/auth/${encodeURIComponent(p.id)}/login`;
    return;
  }
  if (setupBrowserProvider(p)) await manager?.signinRedirect();
};

/** One provider → straight to it; several → the chooser page. */
const login = async () => {
  const list = providers.value;
  if (list.length === 1) return loginWith(list[0]);
  if (list.length > 1 && window.location.pathname !== LOGIN_PATH) window.location.assign(LOGIN_PATH);
};

export const useAuth = () => {
  const user = computed<CroutonUser | null>(() => {
    const s = sessionToken.value ? validSession() : null;
    if (s) {
      return {
        id: String(s['sub'] ?? ''),
        email: typeof s['email'] === 'string' ? s['email'] : undefined,
        name: typeof s['name'] === 'string' ? s['name'] : undefined,
        roles: Array.isArray(s['roles']) ? s['roles'].filter((r): r is string => typeof r === 'string') : [],
        provider: String(s['provider'] ?? ''),
        claims: s,
      };
    }
    const u = oidcUser.value;
    if (!u || u.expired) return null;
    const profile = u.profile as Record<string, unknown>;
    const rawRoles = configuredRolesClaim ? getNestedClaim(profile, configuredRolesClaim) : undefined;
    return {
      id: String(profile['sub'] ?? ''),
      email: profile['email'] ? String(profile['email']) : undefined,
      name: profile['name'] ? String(profile['name']) : undefined,
      roles: Array.isArray(rawRoles) ? rawRoles.filter((r): r is string => typeof r === 'string') : [],
      provider: storage.get(PROVIDER_KEY) ?? 'oidc',
      claims: profile,
    };
  });
  const isAuthenticated = computed(() => !!user.value);

  const logout = async () => {
    if (sessionToken.value) {
      setSessionToken(null);
      window.location.assign('/');
      return;
    }
    await manager?.signoutRedirect();
  };
  const hasRole = (role: string) => user.value?.roles.includes(role) ?? false;
  const getToken = () => (validSession() ? sessionToken.value : null) ?? oidcUser.value?.access_token ?? null;

  return {
    user,
    isAuthenticated,
    login,
    loginWith,
    logout,
    hasRole,
    getToken,
    /** Configured providers (from `GET /_app/auth`). */
    providers: computed(() => providers.value),
    /** App title + logo (from `GET /_app/auth`), for the login screen. */
    app: computed(() => appInfo.value),
  };
};

export const loadOidcUser = async () => {
  if (!manager) return null;
  const u = await manager.getUser();
  oidcUser.value = u;
  return u;
};

export const handleCallback = async () => {
  if (!manager) return null;
  const u = await manager.signinRedirectCallback();
  oidcUser.value = u;
  return u;
};

export const tryRenewOidcUser = async () => {
  if (!manager) return null;
  try {
    const u = await manager.signinSilent();
    if (u) oidcUser.value = u;
    return u;
  } catch {
    oidcUser.value = null;
    return null;
  }
};
