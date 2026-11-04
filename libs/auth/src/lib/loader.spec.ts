import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadAuthProviders } from './loader';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'crouton-auth-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env['CROUTON_DEV_TOKEN'];
  delete process.env['KEYCLOAK_URL'];
  delete process.env['KEYCLOAK_REALM'];
  delete process.env['KEYCLOAK_CLIENT_ID'];
  if (process.env['NODE_ENV'] === 'production') delete process.env['NODE_ENV'];
});

const writeProvider = (name: string, config: Record<string, unknown>) => {
  const providerDir = join(dir, name);
  mkdirSync(providerDir, { recursive: true });
  writeFileSync(
    join(providerDir, 'auth-provider.json'),
    JSON.stringify(config),
  );
};

describe('loadAuthProviders', () => {
  it('returns [] for non-existent directory', async () => {
    expect(await loadAuthProviders('/no/such/path')).toEqual([]);
  });

  it('returns [] for empty directory', async () => {
    expect(await loadAuthProviders(dir)).toEqual([]);
  });

  it('skips folder without auth-provider.json', async () => {
    mkdirSync(join(dir, 'orphan'));
    expect(await loadAuthProviders(dir)).toEqual([]);
  });

  it('loads dev provider with default: true', async () => {
    process.env['CROUTON_DEV_TOKEN'] = 'secret';
    writeProvider('dev', { name: 'dev', provider: 'dev', default: true });
    const providers = await loadAuthProviders(dir);
    expect(providers).toHaveLength(1);
    expect(providers[0].isDefault).toBe(true);
    expect(providers[0].config.provider).toBe('dev');
  });

  it('sets first provider as default when none marked', async () => {
    process.env['CROUTON_DEV_TOKEN'] = 'secret';
    writeProvider('dev', { name: 'dev', provider: 'dev' });
    const providers = await loadAuthProviders(dir);
    expect(providers[0].isDefault).toBe(true);
  });

  it('throws when dev provider used in production', async () => {
    const prev = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    writeProvider('dev', { name: 'dev', provider: 'dev' });
    await expect(loadAuthProviders(dir)).rejects.toThrow(
      'cannot be used in production',
    );
    process.env['NODE_ENV'] = prev;
  });

  it('throws on invalid provider enum in JSON', async () => {
    writeProvider('bad', { name: 'bad', provider: 'ldap' });
    await expect(loadAuthProviders(dir)).rejects.toThrow();
  });
});
