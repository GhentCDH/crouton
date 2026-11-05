import type { AuthEndpointResponse } from '@crouton/auth';
import type { AxiosInstance } from 'axios';

import { handleCallback, loadOidcUser, setupOidcManager, tryRenewOidcUser, useAuth } from './use-auth';

export type AuthSetupResult = {
  enabled: boolean;
  callbackPath: string;
  /** Release the request queue. On the callback page the caller must invoke
   * this after handleCallback() so queued requests fire with the token set. */
  flushQueue: () => void;
};

export const setupAuth = async (
  apiBase: string,
  axios: AxiosInstance,
): Promise<AuthSetupResult> => {
  const isCallbackPage = window.location.pathname.startsWith('/auth/');

  // Token interceptor registered FIRST (LIFO: runs last, after queue releases).
  // Reads oidcUser lazily so it always picks up the token set by loadOidcUser()
  // or handleCallback().
  const { getToken, login } = useAuth();
  axios.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  });

  // Queue interceptor registered SECOND (LIFO: runs first, blocks until auth
  // setup completes). Exempts /_app/auth so the probe request is never self-blocked.
  let authReady = false;
  const pending: Array<() => void> = [];
  const flushQueue = () => { authReady = true; pending.splice(0).forEach((r) => r()); };
  axios.interceptors.request.use(async (config) => {
    if (!authReady && !config.url?.includes('/_app/auth')) {
      await new Promise<void>((r) => pending.push(r));
    }
    return config;
  });

  // Fallback: 401 during an active session (e.g. token expired mid-use) → re-login.
  // Not the primary auth gate — that is the explicit check below after loadOidcUser().
  axios.interceptors.response.use(
    (r) => r,
    async (err) => {
      if (err?.response?.status === 401 && !window.location.pathname.startsWith('/auth/')) {
        await login?.();
      }
      return Promise.reject(err);
    },
  );

  let data: AuthEndpointResponse;
  try {
    const res = await axios.get<AuthEndpointResponse>(`${apiBase}/_app/auth`);
    data = res.data;
  } catch {
    flushQueue();
    return { enabled: false, callbackPath: '', flushQueue };
  }

  if (!data?.providers?.length) {
    flushQueue();
    return { enabled: false, callbackPath: '', flushQueue };
  }

  const defaultProvider = data.providers.find((p) => p.default) ?? data.providers[0];
  if (!defaultProvider?.issuer || !defaultProvider?.clientId) {
    flushQueue();
    return { enabled: false, callbackPath: '', flushQueue };
  }

  const callbackPath = '/auth/callback';

  const DEFAULT_SCOPES = ['openid', 'profile', 'email'];
  const scopes = defaultProvider.scopes ?? DEFAULT_SCOPES;
  setupOidcManager({
    authority: defaultProvider.issuer,
    client_id: defaultProvider.clientId,
    redirect_uri: `${window.location.origin}${callbackPath}`,
    scope: scopes.join(' '),
    automaticSilentRenew: true,
  }, defaultProvider.rolesClaim);

  const storedUser = await loadOidcUser();

  if (isCallbackPage) {
    // On the callback page the code hasn't been exchanged yet — don't flush.
    // The caller (plugin install code) calls flushQueue() after handleCallback().
    return { enabled: true, callbackPath, flushQueue };
  }

  // If the stored user's token is expired, attempt silent renewal before
  // deciding to redirect to login. This handles the page-reload case where
  // the access token expired but the SSO session in Keycloak is still active.
  if (storedUser?.expired) {
    await tryRenewOidcUser();
  }

  if (!getToken()) {
    // No valid session → redirect to login.
    await login?.();
    return { enabled: true, callbackPath, flushQueue };
  }

  // Valid token (fresh or just renewed): release queued requests.
  flushQueue();
  return { enabled: true, callbackPath, flushQueue };
};

export { handleCallback };
