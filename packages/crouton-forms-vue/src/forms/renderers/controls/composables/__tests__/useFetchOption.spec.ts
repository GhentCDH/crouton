import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '../../../../../http-client';
import { clearResourceSchemaCache } from '../../resource';
import {
  clearResolvedOptionCache,
  useFetchOptions,
} from '../useFetchOption';

const USER = { id: 'b4c6f946', name: 'Bo Vandersteene' };

const resourceDescriptor = (findOne: unknown) => ({
  id: 'users',
  uri: '/users',
  operations: {
    findAll: true,
    findOne,
    create: false,
    update: false,
    patch: false,
    delete: false,
    lookup: '/users?q={text}',
  },
  schema: { data: { type: 'object' } },
});

const httpMock = (descriptor: unknown, record: unknown = USER): HttpClient => {
  const get = vi.fn((uri: string) => {
    if (uri === '/users/schemas') return Promise.resolve({ data: descriptor });
    if (uri.startsWith('/users?filter='))
      return Promise.resolve({ data: { data: [record] } });
    return Promise.resolve({ data: record });
  });
  return { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } as unknown as HttpClient;
};

const options = {
  resource: '/users/schemas',
  labelKey: 'name',
  valueKey: 'id',
};

describe('useFetchOptions – fetchByValue', () => {
  beforeEach(() => {
    clearResolvedOptionCache();
    clearResourceSchemaCache();
  });

  it('resolves a stored scalar through findOne', async () => {
    const http = httpMock(resourceDescriptor({ uri: '/users/{id}', method: 'get' }));
    const config = await useFetchOptions(options, http);
    if (!config.fetchByValue) throw new Error('fetchByValue must be defined');

    await expect(config.fetchByValue(USER.id)).resolves.toEqual(USER);
    expect((http.get as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('/users/b4c6f946', undefined, undefined);
  });

  it('falls back to a findAll filter when findOne has no id placeholder', async () => {
    const http = httpMock(resourceDescriptor(true));
    const config = await useFetchOptions(options, http);
    if (!config.fetchByValue) throw new Error('fetchByValue must be defined');

    await expect(config.fetchByValue(USER.id)).resolves.toEqual(USER);
    expect(http.get).toHaveBeenCalledWith(
      `/users?filter=${encodeURIComponent('id:b4c6f946:eq')}`,
    );
  });

  it('caches a resolved option and exposes it synchronously', async () => {
    const http = httpMock(resourceDescriptor({ uri: '/users/{id}', method: 'get' }));
    const config = await useFetchOptions(options, http);
    if (!config.fetchByValue || !config.peekByValue) throw new Error('fetchByValue/peekByValue must be defined');

    expect(config.peekByValue(USER.id)).toBeUndefined();
    await config.fetchByValue(USER.id);
    await config.fetchByValue(USER.id);

    expect(config.peekByValue(USER.id)).toEqual(USER);
    // schema + a single record lookup
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('remembers a picked option so no request is needed', async () => {
    const http = httpMock(resourceDescriptor({ uri: '/users/{id}', method: 'get' }));
    const config = await useFetchOptions(options, http);
    if (!config.rememberValue || !config.peekByValue) throw new Error('rememberValue/peekByValue must be defined');

    config.rememberValue(USER.id, USER);

    expect(config.peekByValue(USER.id)).toEqual(USER);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('returns null for an empty value and never requests', async () => {
    const http = httpMock(resourceDescriptor({ uri: '/users/{id}', method: 'get' }));
    const config = await useFetchOptions(options, http);
    if (!config.fetchByValue) throw new Error('fetchByValue must be defined');

    await expect(config.fetchByValue('')).resolves.toBeNull();
    await expect(config.fetchByValue(null)).resolves.toBeNull();
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('never throws when the record cannot be resolved', async () => {
    const http = httpMock(resourceDescriptor({ uri: '/users/{id}', method: 'get' }));
    (http.get as ReturnType<typeof vi.fn>).mockImplementation((uri: string) =>
      uri === '/users/schemas'
        ? Promise.resolve({ data: resourceDescriptor({ uri: '/users/{id}', method: 'get' }) })
        : Promise.reject(new Error('404')),
    );
    const config = await useFetchOptions(options, http);
    if (!config.fetchByValue) throw new Error('fetchByValue must be defined');

    await expect(config.fetchByValue('missing')).resolves.toBeNull();
  });

  it('has no fetchByValue for uri-based options', async () => {
    const http = httpMock(resourceDescriptor(true));
    const config = await useFetchOptions({ uri: '/search?q={q}' }, http);

    expect(config.fetchByValue).toBeNull();
  });
});

describe('getResourceSchema caching', () => {
  beforeEach(() => {
    clearResolvedOptionCache();
    clearResourceSchemaCache();
  });

  it('fetches the resource descriptor once across calls', async () => {
    const http = httpMock(resourceDescriptor(true));

    await useFetchOptions(options, http);
    await useFetchOptions(options, http);

    expect(http.get).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// exclude option
// ---------------------------------------------------------------------------

// Reuses the same descriptor shape as the existing tests (lookup as string — Zod normalises it).
const httpMockWithItems = (items: unknown[]): HttpClient => {
  const descriptor = resourceDescriptor({ uri: '/users/{id}', method: 'get' });
  const get = vi.fn((uri: string) => {
    if (uri === '/users/schemas') return Promise.resolve({ data: descriptor });
    // lookup calls (/users?q=...) and filtered lookup calls (/users?q=...&filter=...)
    if (uri.startsWith('/users?q=') || uri.startsWith('/users?filter='))
      return Promise.resolve({ data: { data: items } });
    return Promise.resolve({ data: items[0] ?? null });
  });
  return { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } as unknown as HttpClient;
};

describe('useFetchOptions – exclude', () => {
  const ALICE = { id: '1', name: 'Alice' };
  const BOB   = { id: '2', name: 'Bob' };
  const CAROL = { id: '3', name: 'Carol' };

  beforeEach(() => {
    clearResolvedOptionCache();
    clearResourceSchemaCache();
  });

  it('appends not_in filter param to resource lookup URI', async () => {
    const http = httpMockWithItems([ALICE, BOB, CAROL]);
    const config = await useFetchOptions(options, http, {}, [ALICE, BOB]);
    if (!config.fetchOptions) throw new Error('fetchOptions must be defined');

    await config.fetchOptions('', new AbortController().signal);

    const calledUri = (http.get as ReturnType<typeof vi.fn>).mock.calls.find(([u]: [string]) => u.includes('not_in'))?.[0] as string;
    expect(calledUri).toBeDefined();
    expect(calledUri).toContain('not_in');
    expect(calledUri).toContain(encodeURIComponent('["1","2"]'));
  });

  it('client-side fallback strips excluded items', async () => {
    const http = httpMockWithItems([ALICE, BOB, CAROL]);
    const config = await useFetchOptions(options, http, {}, [ALICE]);
    if (!config.fetchOptions) throw new Error('fetchOptions must be defined');

    const results = await config.fetchOptions('', new AbortController().signal) as Array<{ id: string }>;
    const ids = results.map((r) => r.id);
    expect(ids).not.toContain('1');
    expect(ids).toContain('2');
    expect(ids).toContain('3');
  });

  it('resolves {form.path} placeholder to an array', async () => {
    const http = httpMockWithItems([ALICE, BOB, CAROL]);
    const optWithExclude = { ...options, exclude: { values: '{form.linked}' } };
    const config = await useFetchOptions(optWithExclude, http, { linked: [ALICE, BOB] });
    if (!config.fetchOptions) throw new Error('fetchOptions must be defined');

    const results = await config.fetchOptions('', new AbortController().signal) as Array<{ id: string }>;
    const ids = results.map((r) => r.id);
    expect(ids).not.toContain('1');
    expect(ids).not.toContain('2');
    expect(ids).toContain('3');
  });

  it('excludes own value when selected: true and ownValue is set', async () => {
    const http = httpMockWithItems([ALICE, BOB, CAROL]);
    const optWithExclude = { ...options, exclude: { selected: true } };
    const config = await useFetchOptions(optWithExclude, http, {}, undefined, ALICE);
    if (!config.fetchOptions) throw new Error('fetchOptions must be defined');

    const results = await config.fetchOptions('', new AbortController().signal) as Array<{ id: string }>;
    expect(results.map((r) => r.id)).not.toContain('1');
  });

  it('sends no filter param when exclude list is empty', async () => {
    const http = httpMockWithItems([ALICE]);
    const config = await useFetchOptions(options, http, {}, []);
    if (!config.fetchOptions) throw new Error('fetchOptions must be defined');

    await config.fetchOptions('', new AbortController().signal);

    const uris = (http.get as ReturnType<typeof vi.fn>).mock.calls.map(([u]: [string]) => u);
    expect(uris.every((u: string) => !u.includes('not_in'))).toBe(true);
  });

  it('replaces {exclude} placeholder for remote URI variant', async () => {
    const http = { get: vi.fn().mockResolvedValue({ data: [ALICE, BOB] }) } as unknown as HttpClient;
    const remoteOpts = { uri: '/search?q={q}&exclude={exclude}', valueKey: 'id' };
    const config = await useFetchOptions(remoteOpts, http, {}, ['1', '2']);
    if (!config.fetchOptions) throw new Error('fetchOptions must be defined');

    await config.fetchOptions('test', new AbortController().signal);

    const calledUri = (http.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUri).toContain(encodeURIComponent('["1","2"]'));
  });

  it('deduplicates merged exclude sources', async () => {
    const http = httpMockWithItems([ALICE, BOB, CAROL]);
    const optWithExclude = { ...options, exclude: { values: [ALICE] } };
    const config = await useFetchOptions(optWithExclude, http, {}, [ALICE]);
    if (!config.fetchOptions) throw new Error('fetchOptions must be defined');

    const results = await config.fetchOptions('', new AbortController().signal) as Array<{ id: string }>;
    expect(results.map((r) => r.id)).not.toContain('1');
  });
});
