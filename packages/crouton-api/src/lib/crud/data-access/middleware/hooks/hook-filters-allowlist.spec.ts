import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';

import { invalid } from '../../../../../testing/index';
import { createCrudController } from '../../../crud-controller.factory';
import { type DataSourceRegistry, PrismaDataSourceAdapter } from '../../../data-access/adapter';
import { loadResourceConfigsFromDir } from '../../../loader';
import type { Resource } from '../../../resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from '../../../resource/resource-load-errors.registry';
import type { ResourceConfigRegistry } from '../../../resource-config.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type MockController = Record<string, (...args: unknown[]) => Promise<unknown>>;
type QueryArgs = { where?: unknown };

/**
 * #585 — the `operations.findAll.filter` allowlist applies to the client's
 * filters only. Filters `beforeFindAll` adds (scoping fields, relation paths)
 * are trusted, so they need not be opened up to clients.
 */
const HOOKS = `export default {
  beforeFindAll: async (params) => ({
    ...params,
    filter: [...(params.filter ?? []), 'ownerEmail:me@x.be:equals', 'trip.familyId:["f1","f2"]:in'],
  }),
};`;

const resourceJson = (name: string, extra: Record<string, unknown>) =>
  JSON.stringify({
    name,
    route: name,
    source: { model: name === 'groups' ? 'Group' : 'Expense' },
    tag: name,
    schemaVersion: CURRENT_RESOURCE_VERSION,
    ...extra,
  });

const listParams = (filter: string[]) => ({ page: 1, pageSize: 20, filter });

const HOOK_WHERE = [
  { ownerEmail: { equals: 'me@x.be' } },
  { trip: { familyId: { in: ['f1', 'f2'] } } },
];

describe('beforeFindAll filters bypass the filter allowlist (#585)', () => {
  const findManyArgs: QueryArgs[] = [];
  const countArgs: QueryArgs[] = [];
  let tempDir: string;
  let controller: MockController;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-hook-allowlist-'));
    resourceLoadErrorsRegistry.clear();
    findManyArgs.length = 0;
    countArgs.length = 0;

    const expenseDir = join(tempDir, 'groups', 'expense');
    mkdirSync(expenseDir, { recursive: true });
    writeFileSync(
      join(tempDir, 'groups', 'resource.json'),
      resourceJson('groups', {
        operations: { findAll: { filter: ['label'] } },
        columns: {
          id: { idField: true },
          label: { type: 'string' },
          ownerEmail: { type: 'string' },
          expense: { label: 'Expenses', fieldInput: { resource: './expense/resource.json' } },
        },
      }),
    );
    writeFileSync(join(tempDir, 'groups', 'hooks.ts'), HOOKS);
    writeFileSync(
      join(expenseDir, 'resource.json'),
      resourceJson('expense', {
        operations: {},
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
    const model = {
      findMany: async (args: QueryArgs) => {
        findManyArgs.push(args);
        return [];
      },
      count: async (args: QueryArgs) => {
        countArgs.push(args);
        return 0;
      },
    };
    const prisma = { Group: model, expense: model };
    controller = new Cls(
      invalid<DataSourceRegistry>({
        resolve: () => prisma,
        resolveAdapter: () => new PrismaDataSourceAdapter(prisma),
        entries: () => [],
      }),
      invalid<ResourceConfigRegistry>({ getByRoute: async () => undefined }),
    ) as MockController;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('top-level list: hook filters reach findMany and count', async () => {
    await controller['findAll'](listParams(['label:x:equals']), {});
    const expected = { AND: [{ label: { equals: 'x' } }, ...HOOK_WHERE] };
    expect(findManyArgs[0]?.where).toEqual(expected);
    expect(countArgs[0]?.where).toEqual(expected);
  });

  it('top-level list: a client filter outside the allowlist is still a 400', async () => {
    await expect(controller['findAll'](listParams(['ownerEmail:a:equals']), {})).rejects.toThrow(
      'Filter field not allowed: ownerEmail',
    );
  });

  it('sub-resource list: hook filters are trusted', async () => {
    await controller['findAllBy_expense'](listParams(['label:x:equals']), 'g1', { params: { id: 'g1' } });
    expect(findManyArgs[0]?.where).toEqual({
      AND: [{ AND: [{ label: { equals: 'x' } }, ...HOOK_WHERE] }, { groupId: 'g1' }],
    });
  });

  it('sub-resource list: a client filter outside the allowlist is still a 400', async () => {
    await expect(
      controller['findAllBy_expense'](listParams(['ownerEmail:a:equals']), 'g1', { params: { id: 'g1' } }),
    ).rejects.toThrow('Filter field not allowed: ownerEmail');
  });
});
