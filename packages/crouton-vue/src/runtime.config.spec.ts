import { afterEach, describe, expect, it, vi } from 'vitest';

const load = async (base?: string) => {
  vi.resetModules();
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ API_URL: '/api' }),
  });
  vi.stubGlobal('fetch', fetchMock);
  const { loadRuntimeConfig } = await import('./runtime.config');
  await loadRuntimeConfig(base === undefined ? undefined : { base });
  return fetchMock.mock.calls[0][0];
};

describe('loadRuntimeConfig', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to /config.json', async () => {
    expect(await load()).toBe('/config.json');
  });

  it('resolves against the app base', async () => {
    expect(await load('/book/')).toBe('/book/config.json');
    expect(await load('/book')).toBe('/book/config.json');
  });
});
