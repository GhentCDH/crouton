import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const httpMock = (descriptor: any, record: any = USER) => {
  const get = vi.fn((uri: string) => {
    if (uri === '/users/schemas') return Promise.resolve({ data: descriptor });
    if (uri.startsWith('/users?filter='))
      return Promise.resolve({ data: { data: [record] } });
    return Promise.resolve({ data: record });
  });
  return { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } as any;
};

const options = {
  resource: '/users/schemas',
  labelKey: 'name',
  valueKey: 'id',
} as any;

describe('useFetchOptions – fetchByValue', () => {
  beforeEach(() => {
    clearResolvedOptionCache();
    clearResourceSchemaCache();
  });

  it('resolves a stored scalar through findOne', async () => {
    const http = httpMock(resourceDescriptor({ uri: '/users/{id}', method: 'get' }));
    const config = await useFetchOptions(options, http);

    await expect(config.fetchByValue!(USER.id)).resolves.toEqual(USER);
    expect(http.get).toHaveBeenCalledWith('/users/b4c6f946');
  });

  it('falls back to a findAll filter when findOne has no id placeholder', async () => {
    const http = httpMock(resourceDescriptor(true));
    const config = await useFetchOptions(options, http);

    await expect(config.fetchByValue!(USER.id)).resolves.toEqual(USER);
    expect(http.get).toHaveBeenCalledWith(
      `/users?filter=${encodeURIComponent('id:b4c6f946:eq')}`,
    );
  });

  it('caches a resolved option and exposes it synchronously', async () => {
    const http = httpMock(resourceDescriptor({ uri: '/users/{id}', method: 'get' }));
    const config = await useFetchOptions(options, http);

    expect(config.peekByValue!(USER.id)).toBeUndefined();
    await config.fetchByValue!(USER.id);
    await config.fetchByValue!(USER.id);

    expect(config.peekByValue!(USER.id)).toEqual(USER);
    // schema + a single record lookup
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('remembers a picked option so no request is needed', async () => {
    const http = httpMock(resourceDescriptor({ uri: '/users/{id}', method: 'get' }));
    const config = await useFetchOptions(options, http);

    config.rememberValue!(USER.id, USER);

    expect(config.peekByValue!(USER.id)).toEqual(USER);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('returns null for an empty value and never requests', async () => {
    const http = httpMock(resourceDescriptor({ uri: '/users/{id}', method: 'get' }));
    const config = await useFetchOptions(options, http);

    await expect(config.fetchByValue!('')).resolves.toBeNull();
    await expect(config.fetchByValue!(null)).resolves.toBeNull();
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('never throws when the record cannot be resolved', async () => {
    const http = httpMock(resourceDescriptor({ uri: '/users/{id}', method: 'get' }));
    http.get.mockImplementation((uri: string) =>
      uri === '/users/schemas'
        ? Promise.resolve({ data: resourceDescriptor({ uri: '/users/{id}', method: 'get' }) })
        : Promise.reject(new Error('404')),
    );
    const config = await useFetchOptions(options, http);

    await expect(config.fetchByValue!('missing')).resolves.toBeNull();
  });

  it('has no fetchByValue for uri-based options', async () => {
    const http = httpMock(resourceDescriptor(true));
    const config = await useFetchOptions({ uri: '/search?q={q}' } as any, http);

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
