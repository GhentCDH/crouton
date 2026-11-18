import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';

import { invalid } from '../../../../../testing/index';
import { createCrudController } from '../../../crud-controller.factory';
import type { DataSourceRegistry } from '../../../data-access/adapter';
import { loadResourceConfigsFromDir } from '../../../loader';
import type { Resource } from '../../../resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from '../../../resource/resource-load-errors.registry';
import type { ResourceConfigRegistry } from '../../../resource-config.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type MockController = Record<string, (...args: unknown[]) => Promise<unknown>>;
type Captured = { where: string; parent?: { id?: string } };

/**
 * #555 — a prisma sub-resource list (`GET /groups/:id/expense`) must run the
 * child's `beforeFindAll` / `afterFindAll` like a top-level list, so hooks can
 * scope child lists (tenant filters etc.).
 */
const HOOKS = `export default {
  beforeFindAll: async (params, ctx) => {
    globalThis.__CAPTURED__.push({ where: 'beforeFindAll', parent: ctx.parent });
    return { ...params, pageSize: 5 };
  },
  afterFindAll: async (rows, ctx) => {
    globalThis.__CAPTURED__.push({ where: 'afterFindAll', parent: ctx.parent });
    return rows.filter((r) => r.label !== 'hidden');
  },
};`;

const listParams = { page: 1, pageSize: 20, sort: 'label', sortDir: 'asc' as const, filter: [] as string[] };

describe('prisma sub-resource list runs beforeFindAll/afterFindAll (#555)', () => {
  const CAPTURED: Captured[] = [];
  const findManyArgs: Array<{ take?: number }> = [];
  let tempDir: string;
  let controller: MockController;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-sub-findall-'));
    resourceLoadErrorsRegistry.clear();
    CAPTURED.length = 0;
    findManyArgs.length = 0;
    (globalThis as Record<string, unknown>)['__CAPTURED__'] = CAPTURED;

    const expenseDir = join(tempDir, 'groups', 'expense');
    mkdirSync(expenseDir, { recursive: true });
    writeFileSync(
      join(tempDir, 'groups', 'resource.json'),
      JSON.stringify({
        name: 'groups',
        route: 'groups',
        source: { model: 'Group' },
        tag: 'Group',
        operations: {},
        schemaVersion: CURRENT_RESOURCE_VERSION,
        columns: {
          id: { idField: true },
          name: {},
          expense: { label: 'Expenses', fieldInput: { resource: './expense/resource.json' } },
        },
      }),
    );
    writeFileSync(
      join(expenseDir, 'resource.json'),
      JSON.stringify({
        name: 'expense',
        route: 'expense',
        source: { model: 'Expense' },
        tag: 'Expense',
        operations: {},
        schemaVersion: CURRENT_RESOURCE_VERSION,
        columns: {
          id: { type: 'string', idField: true },
          label: { type: 'string', defaultSort: true },
          groupId: { type: 'string' },
        },
      }),
    );
    writeFileSync(join(expenseDir, 'hooks.ts'), HOOKS);

    const configs = await loadResourceConfigsFromDir(tempDir, '/api');
    const parent = configs.find((c) => c.name === 'groups');
    const Cls = createCrudController(invalid<Resource>(parent), '/api');
    const prisma = {
      Group: { findMany: async () => [], count: async () => 0 },
      expense: {
        findMany: async (args: { take?: number }) => {
          findManyArgs.push(args);
          return [
            { id: 'e1', label: 'Groceries', groupId: 'g1' },
            { id: 'e2', label: 'hidden', groupId: 'g1' },
          ];
        },
        count: async () => 2,
      },
    };
    controller = new Cls(
      invalid<DataSourceRegistry>({ resolve: () => prisma, entries: () => [] }),
      invalid<ResourceConfigRegistry>({ getByRoute: async () => undefined }),
    ) as MockController;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete (globalThis as Record<string, unknown>)['__CAPTURED__'];
  });

  it('runs beforeFindAll with ctx.parent and uses its params for the query', async () => {
    await controller['findAllBy_expense'](listParams, 'g1', { params: { id: 'g1' } });
    expect(CAPTURED.find((c) => c.where === 'beforeFindAll')?.parent).toMatchObject({ id: 'g1' });
    expect(findManyArgs[0]?.take).toBe(5);
  });

  it('runs afterFindAll on the result rows', async () => {
    const res = (await controller['findAllBy_expense'](listParams, 'g1', { params: { id: 'g1' } })) as { data: unknown[] };
    expect(CAPTURED.find((c) => c.where === 'afterFindAll')?.parent).toMatchObject({ id: 'g1' });
    expect(res.data).toEqual([expect.objectContaining({ id: 'e1' })]);
  });
});
