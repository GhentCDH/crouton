import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCrudRepository } from '../crud-repository.factory';
import { loadResourceConfigsFromDir } from '../loader';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * `_count` exists to fill a table cell — the "3 expenses" badge on a row. A
 * relation column marked `hiddenInTable` never renders that cell, so counting it
 * costs a subquery per relation per page and produces a field nothing reads.
 *
 * It also widens the blast radius of a config mistake: one bad relation column
 * put its column id in the count clause and Prisma rejected the *whole* list
 * query, taking the parent's table down with it.
 */

const relation = (resource: string, hiddenInTable: boolean) => ({
  label: 'Rel',
  ...(hiddenInTable && { hiddenInTable: true }),
  fieldInput: {
    format: 'relation',
    relationType: 'oneToMany',
    resource,
    foreignKey: 'group_id',
  },
});

const child = (name: string, model: string) => ({
  name,
  route: name,
  model,
  tag: 'Child',
  operations: {},
  columns: { id: { idField: true }, label: {} },
});

describe('_count skips relations hidden from the table', () => {
  let tempDir: string;
  let queries: any[];

  const boot = async (columns: Record<string, unknown>) => {
    mkdirSync(join(tempDir, 'groups', 'expenses'), { recursive: true });
    mkdirSync(join(tempDir, 'groups', 'members'), { recursive: true });
    writeFileSync(
      join(tempDir, 'groups', 'resource.json'),
      JSON.stringify({
        name: 'groups',
        route: 'groups',
        model: 'Group',
        tag: 'Group',
        operations: {},
        columns: { id: { idField: true }, name: {}, ...columns },
      }),
    );
    writeFileSync(
      join(tempDir, 'groups', 'expenses', 'resource.json'),
      JSON.stringify(child('expenses', 'Expense')),
    );
    writeFileSync(
      join(tempDir, 'groups', 'members', 'resource.json'),
      JSON.stringify(child('members', 'GroupMember')),
    );

    const configs = await loadResourceConfigsFromDir(tempDir, '/api');
    const config = configs.find((c) => c.name === 'groups');

    queries = [];
    const prisma: any = {
      Group: {
        findMany: async (q: any) => {
          queries.push(q);
          return [{ id: 'g1', name: 'Trip', _count: { expenses: 3, members: 2 } }];
        },
        count: async () => 1,
      },
    };
    return createCrudRepository(prisma, config as any);
  };

  const list = (repo: any) =>
    repo.findAll({
      page: 1,
      pageSize: 20,
      sort: 'id',
      sortDir: 'asc',
      filter: [],
    });

  const countOf = () => {
    const q = queries[0];
    return q.select?._count ?? q._count;
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-hidden-count-'));
    resourceLoadErrorsRegistry.clear();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('counts a visible relation', async () => {
    const repo = await boot({
      expenses: relation('./expenses/resource.json', false),
    });
    await list(repo);
    expect(Object.keys(countOf().select)).toEqual(['expenses']);
  });

  it('does not count a hidden one', async () => {
    const repo = await boot({
      expenses: relation('./expenses/resource.json', true),
      members: relation('./members/resource.json', false),
    });
    await list(repo);
    expect(Object.keys(countOf().select)).toEqual(['members']);
  });

  it('leaves _count off the query entirely when every relation is hidden', async () => {
    const repo = await boot({
      expenses: relation('./expenses/resource.json', true),
      members: relation('./members/resource.json', true),
    });
    await list(repo);
    expect(countOf()).toBeUndefined();
  });

  it('does not merge a count field onto rows for a hidden relation', async () => {
    const repo = await boot({
      expenses: relation('./expenses/resource.json', true),
      members: relation('./members/resource.json', false),
    });
    const rows: any[] = await list(repo);
    expect(rows[0]).not.toHaveProperty('expenses');
    expect(rows[0].members).toBe(2);
  });

  it('still strips the raw _count off the row', async () => {
    const repo = await boot({
      members: relation('./members/resource.json', false),
    });
    const rows: any[] = await list(repo);
    expect(rows[0]).not.toHaveProperty('_count');
  });
});
