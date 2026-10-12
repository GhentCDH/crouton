export type { RuntimeConfig } from '@ghentcdh/crouton-frontend-core';
export { getRuntimeConfig } from '@ghentcdh/crouton-frontend-core';

import type { RuntimeConfig } from '@ghentcdh/crouton-frontend-core';
import { loadRuntimeConfig as _load } from '@ghentcdh/crouton-frontend-core';

export const loadRuntimeConfig = <RUNTIME_CONFIG extends RuntimeConfig>(
  config: { authToken?: string; baseUrl?: string } = {},
): Promise<RUNTIME_CONFIG> =>
  _load<RUNTIME_CONFIG>({
    ...config,
    baseUrl: config.baseUrl ?? (import.meta.env?.BASE_URL ?? '/'),
  });
