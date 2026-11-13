import type { AuthEndpointResponse } from '@crouton/auth';
import type { AxiosInstance } from 'axios';

import {
  CALLBACK_PATH,
  loadOidcUser,
  pickBrowserProvider,
  setAuthProviders,
  setSessionToken,
  setupBrowserProvider,
  tryRenewOidcUser,
  useAuth,
} from './use-auth';

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
        setSessionToken(null); // rejected by the backend (expired, rotated secret) → drop it
        await login();
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

  // Providers the frontend can log in with: server-side OAuth2, or browser PKCE (issuer + clientId).
  // Others (dev, custom without client config) authenticate out-of-band → no login UI.
  const loginable = (data?.providers ?? []).filter((p) => p.loginMode === 'server' || (p.issuer && p.clientId));
  if (!loginable.length) {
    flushQueue();
    return { enabled: false, callbackPath: '', flushQueue };
  }

  const callbackPath = CALLBACK_PATH;
  setAuthProviders(loginable, data.app, `${axios.defaults.baseURL ?? ''}${apiBase}`.replace(/\/$/, ''));

  const browserProvider = pickBrowserProvider();
  const storedUser = browserProvider && setupBrowserProvider(browserProvider) ? await loadOidcUser() : null;

  if (isCallbackPage) {
    // On /auth/* pages (callback, login chooser) don't flush: the callback
    // caller invokes flushQueue() after storing the token.
    return { enabled: true, callbackPath, flushQueue };
  }

  // If the stored user's token is expired, attempt silent renewal before
  // deciding to redirect to login. This handles the page-reload case where
  // the access token expired but the SSO session in Keycloak is still active.
  if (storedUser?.expired) {
    await tryRenewOidcUser();
  }

  if (!getToken()) {
    // No valid session → login (single provider) or the chooser (several).
    await login();
    return { enabled: true, callbackPath, flushQueue };
  }

  // Valid token (fresh or just renewed): release queued requests.
  flushQueue();
  return { enabled: true, callbackPath, flushQueue };
};
