import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';

import { invalid } from '../../../../../testing/index';
import type { DataSourceResolver } from '../../../custom-repository';
import { loadResourceConfigsFromDir } from '../../../loader';
import type { Resource } from '../../../resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from '../../../resource/resource-load-errors.registry';
import type { DataSourceAdapter } from '../../adapter';
import { createCrudRepository } from '../../repository';
import type { WriteHookContext } from './hooks.types';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * #582 — `delete` must run `beforeWrite` (with `data` undefined) before the row
 * is removed, so an ownership check that throws actually blocks the delete.
 */
describe('delete runs beforeWrite first (#582)', () => {
  let tempDir: string;
  let config: Resource;
  let calls: { data: unknown; ctx: WriteHookContext }[];
  let deny: boolean;
  let prismaDelete: ReturnType<typeof vi.fn>;
  let adapterDelete: ReturnType<typeof vi.fn>;

  const beforeWrite = (data: unknown, ctx: WriteHookContext) => {
    calls.push({ data, ctx });
    if (deny) throw new Error('not yours');
    return data;
  };

  const legacyRepo = () =>
    createCrudRepository({ Book: { delete: prismaDelete } }, config);

  const adapterRepo = () => {
    const adapter = invalid<DataSourceAdapter>({
      kind: 'prisma',
      findAll: async () => ({ data: [], count: 0 }),
      count: async () => 0,
      delete: adapterDelete,
    });
    return createCrudRepository(
      {},
      config,
      invalid<DataSourceResolver>({
        resolve: () => ({}),
        entries: () => [],
        resolveAdapter: () => adapter,
      }),
    );
  };

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-delete-hooks-'));
    resourceLoadErrorsRegistry.clear();
    mkdirSync(join(tempDir, 'books'), { recursive: true });
    writeFileSync(
      join(tempDir, 'books', 'resource.json'),
      JSON.stringify({
        name: 'books',
        route: 'books',
        source: { model: 'Book' },
        tag: 'Book',
        operations: {},
        schemaVersion: CURRENT_RESOURCE_VERSION,
        columns: { id: { type: 'string', idField: true }, title: {} },
      }),
    );
    const configs = await loadResourceConfigsFromDir(tempDir, '/api');
    const loaded = configs.find((c) => c.name === 'books') as Resource;
    config = { ...loaded, hooks: { beforeWrite } };
    calls = [];
    deny = false;
    prismaDelete = vi.fn(async () => ({ id: 'b1' }));
    adapterDelete = vi.fn(async () => ({ id: 'b1' }));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe.each([
    ['legacy prisma path', legacyRepo, () => prismaDelete],
    ['adapter path', adapterRepo, () => adapterDelete],
  ])('%s', (_name, repo, deleteFn) => {
    it('does not delete when beforeWrite throws', async () => {
      deny = true;
      await expect(repo().delete('b1')).rejects.toThrow('not yours');
      expect(deleteFn()).not.toHaveBeenCalled();
    });

    it('deletes when beforeWrite passes, with op "delete", the id and no data', async () => {
      await repo().delete('b1', { user: 'me' });
      expect(deleteFn()).toHaveBeenCalledOnce();
      expect(calls).toHaveLength(1);
      expect(calls[0]?.data).toBeUndefined();
      expect(calls[0]?.ctx.op).toBe('delete');
      expect(calls[0]?.ctx.id).toBe('b1');
      expect(calls[0]?.ctx.request).toEqual({ user: 'me' });
    });
  });
});
