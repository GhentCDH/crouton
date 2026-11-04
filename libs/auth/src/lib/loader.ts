import { getDefaultEnv, resolveEnv } from './env';
import { PRESETS } from './presets';
import { AuthProviderSchema } from './schema';
import type { AuthProviderAdapter, LoadedProvider } from './types';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const loadAuthProviders = async (authProvidersDir: string): Promise<LoadedProvider[]> => {
  if (!fs.existsSync(authProvidersDir)) return [];

  const entries = fs
    .readdirSync(authProvidersDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const providers: LoadedProvider[] = [];

  for (const name of entries) {
    const jsonPath = path.join(authProvidersDir, name, 'auth-provider.json');
    if (!fs.existsSync(jsonPath)) continue;

    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as unknown;
    const config = AuthProviderSchema.parse(raw);

    const envMap = { ...getDefaultEnv(config.provider), ...(config.env ?? {}) };

    let issuer: string | undefined;
    let adapter: AuthProviderAdapter | undefined;

    if (config.provider === 'custom') {
      const indexPath = path.join(authProvidersDir, name, 'index.ts');
      const mod = (await import(indexPath)) as { default: AuthProviderAdapter };
      adapter = mod.default;
    } else if (config.provider === 'dev') {
      if (process.env['NODE_ENV'] === 'production') {
        throw new Error(`Auth provider "${name}": provider "dev" cannot be used in production`);
      }
    } else {
      const env = resolveEnv(envMap);
      const preset = PRESETS[config.provider];
      if (!preset) throw new Error(`Unknown provider: ${config.provider}`);
      issuer = preset.issuer(env);
    }

    providers.push({ config, strategyName: name, isDefault: config.default ?? false, issuer, adapter });
  }

  if (providers.length > 0 && !providers.some((p) => p.isDefault)) {
    providers[0].isDefault = true;
  }

  return providers;
};
