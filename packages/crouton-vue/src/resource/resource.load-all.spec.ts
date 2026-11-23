import { describe, expect, it, vi } from 'vitest';

import type { ResourceDefinition } from '@ghentcdh/crouton-core';

import { Resource } from './resource';
import type { ResourceApiInstance } from './resource.api';

const formDef = { schemas: { table: { ui: { type: 'Table', options: {} } } } } as unknown as ResourceDefinition;

const pagedApi = (total: number) => {
  const loadData = vi.fn(async (req: { page: number; pageSize: number }) => {
    const start = (req.page - 1) * req.pageSize;
    const data = Array.from({ length: Math.max(0, Math.min(req.pageSize, total - start)) }, (_, i) => ({
      id: start + i,
    }));
    return { data, request: { count: total } };
  });
  return { loadData } as unknown as ResourceApiInstance & { loadData: typeof loadData };
};

describe('Resource.loadAll', () => {
  it('fetches every page with the current filter and sort', async () => {
    const api = pagedApi(5);
    const resource = new Resource(formDef, api, { filter: ['title:x:contains'], sort: 'title' }, vi.fn(), false);

    const rows = await resource.loadAll(2);

    expect(rows).toHaveLength(5);
    expect(api.loadData).toHaveBeenCalledTimes(3);
    expect(api.loadData.mock.calls[2][0]).toMatchObject({ page: 3, pageSize: 2, filter: ['title:x:contains'], sort: 'title' });
  });

  it('returns null when a page fails', async () => {
    const api = { loadData: vi.fn(async () => null) } as unknown as ResourceApiInstance;
    const resource = new Resource(formDef, api, {}, vi.fn(), false);

    expect(await resource.loadAll()).toBeNull();
  });
});
