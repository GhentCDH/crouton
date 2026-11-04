import type { AuthEndpointResponse } from '@crouton/auth';
import type { AxiosInstance } from 'axios';

import { handleCallback, loadOidcUser, setupOidcManager, useAuth } from './use-auth';

export type AuthSetupResult = {
  enabled: boolean;
  callbackPath: string;
};

export const setupAuth = async (
  apiBase: string,
  axios: AxiosInstance,
): Promise<AuthSetupResult> => {
  // Token interceptor registered first (LIFO: runs last, after queue releases).
  // Reads oidcUser lazily so it always picks up the token set by loadOidcUser().
  const { getToken } = useAuth();
  axios.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  });

  // Queue interceptor registered second (LIFO: runs first, blocks until auth
  // setup completes). Route components that fire API calls on mount get held
  // here until loadOidcUser() has run and the token is available.
  // Excludes /_app/auth so the probe request is never self-blocked.
  let authReady = false;
  const pending: Array<() => void> = [];
  const flushQueue = () => { authReady = true; pending.splice(0).forEach((r) => r()); };
  axios.interceptors.request.use(async (config) => {
    if (!authReady && !config.url?.includes('/_app/auth')) {
      await new Promise<void>((r) => pending.push(r));
    }
    return config;
  });

  // Response interceptor: redirect to login on 401, but not while processing
  // the OIDC callback (would create a redirect loop).
  axios.interceptors.response.use(
    (r) => r,
    async (err) => {
      if (err?.response?.status === 401 && !window.location.pathname.startsWith('/auth/')) {
        const { login } = useAuth();
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
    return { enabled: false, callbackPath: '' };
  }

  if (!data?.providers?.length) { flushQueue(); return { enabled: false, callbackPath: '' }; }

  const defaultProvider = data.providers.find((p) => p.default) ?? data.providers[0];
  if (!defaultProvider?.issuer || !defaultProvider?.clientId) {
    flushQueue();
    return { enabled: false, callbackPath: '' };
  }

  const callbackPath = '/auth/callback';

  setupOidcManager({
    authority: defaultProvider.issuer,
    client_id: defaultProvider.clientId,
    redirect_uri: `${window.location.origin}${callbackPath}`,
    scope: 'openid profile email',
    automaticSilentRenew: true,
  });

  await loadOidcUser();

  // Auth setup done: release queued requests (token interceptor runs after queue).
  flushQueue();

  return { enabled: true, callbackPath };
};

export { handleCallback };
