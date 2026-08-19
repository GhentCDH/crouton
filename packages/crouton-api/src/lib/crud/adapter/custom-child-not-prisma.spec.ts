import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCrudController } from '../crud-controller.factory';
import { createCrudRepository } from '../crud-repository.factory';
import { loadResourceConfigsFromDir } from '../loader';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * A `kind: "custom"` child declared by a relation column on a prisma parent is a
 * *route*, not a database relation: reads and writes go through its own
 * `repository.ts`, and the parent's model has no field of that name.
 *
 * So it must stay out of every Prisma-shaped clause the parent builds. `_count`
 * was the one that leaked — a visible custom child produced
 * `_count: { select: { expense: true } }` and Prisma rejected the entire list
 * query with `Unknown field "expense" for select statement on model
 * "GroupsCountOutputType"`, taking the parent's table down with it. It only
 * looked fine while the column happened to be `hiddenInTable`.
 *
 * Also pins that the column needs no `format` or `relationType`: `resource` alone
 * declares the child, and `oneToMany` is derived.
 */

const CHILD = {
  kind: 'custom',
  name: 'expense',
  route: 'expense',
  tag: 'Expense',
  operations: {},
  columns: {
    id: { type: 'string', idField: true },
    label: { type: 'string', defaultSort: true },
    amount: { type: 'number' },
  },
};

const REPOSITORY =
  'export default {' +
  '  findAllByParent: async (p, params) => ({ data: [{ id: "e1", label: "Groceries" }], count: 1 }),' +
  '  findOneByParent: async () => ({ id: "e1", label: "Groceries" }),' +
  '  createByParent: async (p, d) => ({ id: "e9", groupId: p, ...d }),' +
  '  updateByParent: async () => ({}),' +
  '  deleteByParent: async () => ({}),' +
  '};';

/** The column the user actually wants: no `format`, no `relationType`. */
const MINIMAL_COLUMN = {
  label: 'Expenses',
  fieldInput: { resource: './expense/resource.json', foreignKey: 'groupId' },
};

describe('a custom child is a route, not a Prisma relation', () => {
  let tempDir: string;
  let queries: any[];
  let parent: any;

  const boot = async (column: Record<string, unknown>, include?: unknown[]) => {
    mkdirSync(join(tempDir, 'groups', 'expense'), { recursive: true });
    writeFileSync(
      join(tempDir, 'groups', 'resource.json'),
      JSON.stringify({
        name: 'groups',
        route: 'groups',
        model: 'Group',
        tag: 'Group',
        operations: {},
        ...(include && { include }),
        columns: { id: { idField: true }, name: {}, expense: column },
      }),
    );
    writeFileSync(
      join(tempDir, 'groups', 'expense', 'resource.json'),
      JSON.stringify(CHILD),
    );
    writeFileSync(
      join(tempDir, 'groups', 'expense', 'repository.ts'),
      REPOSITORY,
    );

    const configs = await loadResourceConfigsFromDir(tempDir, '/api');
    parent = configs.find((c) => c.name === 'groups');

    queries = [];
    const prisma: any = {
      Group: {
        findMany: async (q: any) => {
          queries.push(q);
          return [{ id: 'g1', name: 'Trip' }];
        },
        findUnique: async (q: any) => {
          queries.push(q);
          return { id: 'g1', name: 'Trip' };
        },
        count: async () => 1,
      },
    };
    return { prisma, repo: createCrudRepository(prisma, parent as any) };
  };

  const listParams = {
    page: 1,
    pageSize: 20,
    sort: 'id',
    sortDir: 'asc' as const,
    filter: [] as string[],
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-custom-child-'));
    resourceLoadErrorsRegistry.clear();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('`resource` alone declares the child', () => {
    it('builds the sub-resource with no format and no relationType', async () => {
      await boot(MINIMAL_COLUMN);
      expect(resourceLoadErrorsRegistry.getAll()).toEqual([]);
      const [sub] = parent.subResources;
      expect(sub.childKind).toBe('custom');
      expect(sub.relationType).toBe('oneToMany');
      expect(sub.childModel).toBe('');
    });

    it('registers the child routes on the parent controller', async () => {
      const { prisma } = await boot(MINIMAL_COLUMN);
      const Cls = createCrudController(parent, '/api');
      const controller: any = new Cls(
        { resolve: () => prisma, entries: () => [] } as any,
        { getByRoute: async () => undefined } as any,
      );
      const methods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(controller),
      );
      expect(methods).toContain('getSchemas_expense');
      expect(methods).toContain('findAllBy_expense');
      expect(methods).toContain('createChild_expense');
    });
  });

  describe('the parent’s findAll never names it', () => {
    it('leaves it out of _count even when visible in the table', async () => {
      const { repo } = await boot(MINIMAL_COLUMN);
      await repo.findAll(listParams);
      const count = queries[0].select?._count ?? queries[0]._count;
      expect(count).toBeUndefined();
    });

    it('leaves it out of include', async () => {
      const { repo } = await boot(MINIMAL_COLUMN);
      await repo.findAll(listParams);
      expect(queries[0].include).toBeUndefined();
    });

    it('drops it from an explicit config include rather than failing the query', async () => {
      const { repo } = await boot(MINIMAL_COLUMN, ['expense']);
      await repo.findAll(listParams);
      const include = queries[0].include ?? queries[0].select;
      expect(include?.expense).toBeUndefined();
    });
  });

  describe('the parent’s findOne never names it', () => {
    it('does not auto-include a visible custom child', async () => {
      const { repo } = await boot({
        ...MINIMAL_COLUMN,
        hiddenInForm: false,
        hiddenInView: false,
      });
      await repo.findOne('g1');
      const q = queries[0];
      expect(q.include?.expense).toBeUndefined();
      expect(q.select?.expense).toBeUndefined();
    });
  });

  describe('the data still comes from the repository', () => {
    it('lists through findAllByParent', async () => {
      await boot(MINIMAL_COLUMN);
      const Cls = createCrudController(parent, '/api');
      const controller: any = new Cls(
        {
          resolve: () => ({
            Group: { findMany: async () => [], count: async () => 0 },
          }),
          entries: () => [],
        } as any,
        { getByRoute: async () => undefined } as any,
      );
      const result = await controller.findAllBy_expense(
        listParams,
        undefined,
        'g1',
        { params: { id: 'g1' } },
      );
      expect(result.data).toEqual([{ id: 'e1', label: 'Groceries' }]);
    });
  });
});
