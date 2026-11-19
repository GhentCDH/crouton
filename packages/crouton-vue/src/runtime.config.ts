export interface RuntimeConfig {
  APP_VERSION: string;
  BUILD_SHA: string;
  API_URL: string;
  env: 'DEV' | 'TST' | 'QAS' | 'PRD';
}

let cachedConfig: RuntimeConfig | null = null;

export const loadRuntimeConfig = async <
  RUNTIME_CONFIG extends RuntimeConfig,
>(
  /**
   * App base path, e.g. `{ base: import.meta.env.BASE_URL }` from the app's
   * own code. Defaults to `/`. Reading `BASE_URL` here would bake in the
   * library's build-time value, not the app's (#592).
   */
  options: { base?: string } = {},
): Promise<RUNTIME_CONFIG> => {
  if (cachedConfig) {
    return cachedConfig as RUNTIME_CONFIG;
  }

  try {
    const base = (options.base || '/').replace(/\/?$/, '/');
    const response = await fetch(`${base}config.json`);
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    cachedConfig = (await response.json()) as RuntimeConfig;
    return cachedConfig as RUNTIME_CONFIG;
  } catch (error) {
    console.error('Failed to load runtime config:', error);
    throw new Error(String(error), { cause: error });
  }
};

export const getRuntimeConfig = <
  RUNTIME_CONFIG extends RuntimeConfig,
>(): RUNTIME_CONFIG => {
  if (!cachedConfig) {
    throw new Error(
      'Runtime config not loaded. Call loadRuntimeConfig() first.',
    );
  }
  return cachedConfig as RUNTIME_CONFIG;
};