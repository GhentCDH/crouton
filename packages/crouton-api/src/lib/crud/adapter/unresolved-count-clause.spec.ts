import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCrudRepository } from '../crud-repository.factory';
import { loadResourceConfigsFromDir } from '../loader';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * `findAll` asks Prisma to count every oneToMany sub-resource via
 * `_count: { select: { <relation>: true } }`. Those relations come straight from
 * `config.subResources`, so a relation column that resolved to nothing used to
 * put its *column id* in the count clause and Prisma rejected the whole query:
 *
 *   Unknown field `expense` for select statement on model `GroupsCountOutputType`
 *
 * The list endpoint for the parent broke, not just the child's routes. With the
 * unresolvable column no longer producing a sub-resource, the count clause is
 * built from the relations that do exist.
 */

const PARENT = {
  name: 'groups',
  route: 'groups',
  model: 'Group',
  tag: 'Group',
  operations: {},
  columns: {
    id: { idField: true },
    name: { searchable: true },
    // Resolves — a real Prisma relation. Shown in the table, so it is counted.
    expenses: {
      label: 'Expenses',
      fieldInput: {
        format: 'relation',
        relationType: 'oneToMany',
        resource: './groupExpenses/resource.json',
        foreignKey: 'group_id',
      },
    },
    // Does not resolve — the directory was moved out from under the parent.
    // Visible in the table, so `hiddenInTable` is not what keeps it out of the
    // count clause here.
    expense: {
      label: 'Expense',
      fieldInput: {
        format: 'relation',
        relationType: 'oneToMany',
        resource: './expense/resource.json',
        foreignKey: 'group_id',
      },
    },
  },
};

const CHILD = {
  name: 'groupExpenses',
  route: 'groupExpenses',
  model: 'GroupExpense',
  tag: 'Expense',
  operations: {},
  columns: { id: { idField: true }, label: {} },
};

describe('the _count clause skips a relation column that resolved to nothing', () => {
  let tempDir: string;
  let queries: any[];
  let repo: any;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-count-'));
    resourceLoadErrorsRegistry.clear();

    mkdirSync(join(tempDir, 'groups', 'groupExpenses'), { recursive: true });
    writeFileSync(
      join(tempDir, 'groups', 'resource.json'),
      JSON.stringify(PARENT, null, 2),
    );
    writeFileSync(
      join(tempDir, 'groups', 'groupExpenses', 'resource.json'),
      JSON.stringify(CHILD, null, 2),
    );

    const configs = await loadResourceConfigsFromDir(tempDir, '/api');
    const config = configs.find((c) => c.name === 'groups');

    queries = [];
    const prisma: any = {
      Group: {
        findMany: async (q: any) => {
          queries.push(q);
          return [];
        },
        count: async () => 0,
      },
    };
    repo = createCrudRepository(prisma, config as any);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('counts the relation that resolved', async () => {
    await repo.findAll({
      page: 1,
      pageSize: 20,
      sort: 'id',
      sortDir: 'asc',
      filter: [],
    });

    const count = queries[0].select?._count ?? queries[0]._count;
    expect(Object.keys(count.select)).toEqual(['expenses']);
  });

  it('does not ask Prisma for a field the model has no relation for', async () => {
    await repo.findAll({
      page: 1,
      pageSize: 20,
      sort: 'id',
      sortDir: 'asc',
      filter: [],
    });

    const count = queries[0].select?._count ?? queries[0]._count;
    expect(count.select).not.toHaveProperty('expense');
  });

  it('still reports the broken column on the status page', () => {
    const error = resourceLoadErrorsRegistry
      .getAll()
      .find((e) => e.error.includes('Relation column "expense"'));
    expect(error).toBeDefined();
  });
});
