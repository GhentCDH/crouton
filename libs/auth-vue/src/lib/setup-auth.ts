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
  let data: AuthEndpointResponse;
  try {
    const res = await axios.get<AuthEndpointResponse>(`${apiBase}/_app/auth`);
    data = res.data;
  } catch {
    return { enabled: false, callbackPath: '' };
  }

  if (!data?.providers?.length) return { enabled: false, callbackPath: '' };

  const defaultProvider = data.providers.find((p) => p.default) ?? data.providers[0];
  if (!defaultProvider?.issuer || !defaultProvider?.clientId) {
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

  const { getToken, login } = useAuth();

  axios.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  });

  // ponytail: redirect on 401, no refresh-token retry — add token refresh if needed
  axios.interceptors.response.use(
    (r) => r,
    async (err) => {
      if (err?.response?.status === 401) await login?.();
      return Promise.reject(err);
    },
  );

  return { enabled: true, callbackPath };
};

export { handleCallback };
