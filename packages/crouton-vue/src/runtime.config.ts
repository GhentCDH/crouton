export interface RuntimeConfig {
  APP_VERSION: string;
  BUILD_SHA: string;
  API_URL: string;
  env: 'DEV' | 'TST' | 'QAS' | 'PRD';
}

let cachedConfig: RuntimeConfig | null = null;

export const loadRuntimeConfig = async <
  RUNTIME_CONFIG extends RuntimeConfig,
>(): Promise<RUNTIME_CONFIG> => {
  if (cachedConfig) {
    return cachedConfig as RUNTIME_CONFIG;
  }

  // In production, fetch from config.json (relative to base URL)
  try {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const response = await fetch(`${baseUrl}config.json`);
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