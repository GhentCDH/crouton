import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadResourceConfigsFromDir } from '../loader';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * A relation column whose `resource` path does not resolve used to fall through
 * as a Prisma-backed sub-resource named after the *column*: `buildSubResources`
 * set `childModel: c.id`, the parent registered `GET :id/<column>` routes, and
 * the first request died with `Prisma model "<column>" not found` — from a
 * stack that named the framework, not the config that caused it.
 *
 * The same silence hid the more subtle mistake of nesting a resource twice: once
 * with `parent` on the child, once with a relation column on the parent. Both
 * register a handler for the same path.
 *
 * Both are now reported at load time.
 */

const parentJson = (resource: string) => ({
  name: 'groups',
  route: 'groups',
  model: 'Group',
  tag: 'Group',
  operations: {},
  columns: {
    id: { idField: true },
    name: { searchable: true },
    expense: {
      label: 'Expenses',
      hiddenInTable: true,
      fieldInput: {
        format: 'relation',
        relationType: 'oneToMany',
        resource,
        foreignKey: 'group_id',
      },
    },
  },
});

const CHILD_REPOSITORY =
  'export default { findAllByParent: async () => ({ data: [], count: 0 }), ' +
  'findOneByParent: async () => null, createByParent: async () => ({}), ' +
  'updateByParent: async () => ({}), deleteByParent: async () => ({}) };';

describe('a relation column that does not resolve to a child config', () => {
  let tempDir: string;

  const writeParent = (resource: string) => {
    mkdirSync(join(tempDir, 'groups'), { recursive: true });
    writeFileSync(
      join(tempDir, 'groups', 'resource.json'),
      JSON.stringify(parentJson(resource), null, 2),
    );
  };

  const load = async () => {
    const configs = await loadResourceConfigsFromDir(tempDir, '/api');
    return configs.find((c) => c.name === 'groups') as any;
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-unresolved-'));
    resourceLoadErrorsRegistry.clear();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports the column and the paths it tried', async () => {
    writeParent('./expense/resource.json');
    await load();

    const [error] = resourceLoadErrorsRegistry.getAll();
    expect(error).toBeDefined();
    expect(error.name).toBe('groups');
    expect(error.error).toContain('Relation column "expense"');
    expect(error.error).toContain('no resource.json was found');
    expect(error.error).toContain(join('groups', 'expense', 'resource.json'));
  });

  it('registers no sub-resource rather than inventing a Prisma model', async () => {
    writeParent('./expense/resource.json');
    const parent = await load();
    expect(parent.subResources ?? []).toHaveLength(0);
  });

  it('reports a child that exists but does not parse', async () => {
    writeParent('./expense/resource.json');
    mkdirSync(join(tempDir, 'groups', 'expense'), { recursive: true });
    writeFileSync(
      join(tempDir, 'groups', 'expense', 'resource.json'),
      '{ "kind": "custom", "name": "expense", "route": "expense", "columns": { "id": {} } }',
    );
    const parent = await load();

    expect(parent.subResources ?? []).toHaveLength(0);
    const error = resourceLoadErrorsRegistry
      .getAll()
      .find((e) => e.error.includes('could not be read'));
    expect(error?.error).toContain('Relation column "expense"');
  });

  it('leaves a relation pointing at another service alone', async () => {
    writeParent('https://other.example/api/expenses');
    const parent = await load();

    expect(resourceLoadErrorsRegistry.getAll()).toEqual([]);
    expect(parent.subResources ?? []).toHaveLength(0);
  });
});

describe('a child nested both ways at once', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-double-nested-'));
    resourceLoadErrorsRegistry.clear();

    mkdirSync(join(tempDir, 'groups', 'expense'), { recursive: true });
    writeFileSync(
      join(tempDir, 'groups', 'resource.json'),
      JSON.stringify(parentJson('./expense/resource.json'), null, 2),
    );
    writeFileSync(
      join(tempDir, 'groups', 'expense', 'resource.json'),
      JSON.stringify({
        name: 'expense',
        route: 'expense',
        tag: 'Expense',
        kind: 'custom',
        parent: { route: 'groups', param: 'groupId' },
        operations: {},
        columns: { id: { type: 'string', idField: true }, label: { type: 'string' } },
      }),
    );
    writeFileSync(
      join(tempDir, 'groups', 'expense', 'repository.ts'),
      CHILD_REPOSITORY,
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('says the two forms of nesting are mutually exclusive', async () => {
    await loadResourceConfigsFromDir(tempDir, '/api');
    const error = resourceLoadErrorsRegistry
      .getAll()
      .find((e) => e.error.includes('mutually exclusive'));
    expect(error?.error).toContain('"parent"');
    expect(error?.error).toContain('Relation column "expense"');
  });

  it('does not register the competing sub-resource route', async () => {
    const configs = await loadResourceConfigsFromDir(tempDir, '/api');
    const parent: any = configs.find((c) => c.name === 'groups');
    expect(parent.subResources ?? []).toHaveLength(0);
  });
});
