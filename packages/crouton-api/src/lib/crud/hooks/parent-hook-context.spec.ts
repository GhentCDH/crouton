import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCrudController } from '../crud-controller.factory';
import { loadResourceConfigsFromDir } from '../loader';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * A hook on a nested resource needs the parent id — an expense's `beforeWrite`
 * wants the group it belongs to. It used to have only `ctx.request`, which meant
 * digging `request.params.id` out by hand and knowing *which* param name applies:
 * a sub-resource is served by the parent's controller, so the parent arrives as
 * `:id`, while a resource declaring `parent` names its own (`:groupId`).
 *
 * `ctx.parent` now carries `{ route, param, id }` in both cases — the same shape
 * `CustomRepositoryContext.parent` uses, so a hook and a `repository.ts` read it
 * identically.
 */

const CAPTURED: any[] = [];

const HOOKS = `export default {
  beforeWrite: async (data, ctx) => {
    globalThis.__CAPTURED__.push({ where: 'beforeWrite', op: ctx.op, parent: ctx.parent });
    return data;
  },
  afterRead: async (row, ctx) => {
    globalThis.__CAPTURED__.push({ where: 'afterRead', op: ctx.op, parent: ctx.parent });
    return row;
  },
};`;

const CHILD_REPOSITORY = `export default {
  findAllByParent: async () => ({ data: [{ id: 'e1', label: 'Groceries' }], count: 1 }),
  findOneByParent: async () => ({ id: 'e1', label: 'Groceries' }),
  createByParent: async (p, d) => ({ id: 'e9', ...d }),
  updateByParent: async (p, i, d) => ({ id: i, ...d }),
  deleteByParent: async (p, i) => ({ id: i }),
};`;

const CHILD_JSON = {
  kind: 'custom',
  name: 'expense',
  route: 'expense',
  tag: 'Expense',
  operations: {},
  columns: {
    id: { type: 'string', idField: true },
    label: { type: 'string', defaultSort: true },
  },
};

const listParams = {
  page: 1,
  pageSize: 20,
  sort: 'label',
  sortDir: 'asc' as const,
  filter: [] as string[],
};

describe('ctx.parent on a nested hook', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-parent-hook-'));
    resourceLoadErrorsRegistry.clear();
    CAPTURED.length = 0;
    (globalThis as any).__CAPTURED__ = CAPTURED;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete (globalThis as any).__CAPTURED__;
  });

  describe('a custom sub-resource under a prisma parent', () => {
    let controller: any;

    beforeEach(async () => {
      const expenseDir = join(tempDir, 'groups', 'expense');
      mkdirSync(expenseDir, { recursive: true });
      writeFileSync(
        join(tempDir, 'groups', 'resource.json'),
        JSON.stringify({
          name: 'groups',
          route: 'groups',
          model: 'Group',
          tag: 'Group',
          operations: {},
          columns: {
            id: { idField: true },
            name: {},
            expense: {
              label: 'Expenses',
              fieldInput: { resource: './expense/resource.json' },
            },
          },
        }),
      );
      writeFileSync(join(expenseDir, 'resource.json'), JSON.stringify(CHILD_JSON));
      writeFileSync(join(expenseDir, 'repository.ts'), CHILD_REPOSITORY);
      writeFileSync(join(expenseDir, 'hooks.ts'), HOOKS);

      const configs = await loadResourceConfigsFromDir(tempDir, '/api');
      const parent = configs.find((c) => c.name === 'groups');
      const Cls = createCrudController(parent as any, '/api');
      const prisma: any = {
        Group: { findMany: async () => [], count: async () => 0 },
      };
      controller = new Cls(
        { resolve: () => prisma, entries: () => [] } as any,
        { getByRoute: async () => undefined } as any,
      );
    });

    it('gives beforeWrite the parent id on create', async () => {
      await controller.createChild_expense('g1', { label: 'x' }, {
        params: { id: 'g1' },
      });
      const hook = CAPTURED.find((c) => c.where === 'beforeWrite');
      expect(hook.parent).toEqual({ route: 'groups', param: 'id', id: 'g1' });
    });

    it('gives beforeWrite the parent id on update', async () => {
      await controller.updateChild_expense('g1', 'e1', { label: 'y' }, {
        params: { id: 'g1' },
      });
      const hook = CAPTURED.find((c) => c.where === 'beforeWrite');
      expect(hook.parent.id).toBe('g1');
    });

    it('gives afterRead the parent id on a child list', async () => {
      await controller.findAllBy_expense(listParams, undefined, 'g2', {
        params: { id: 'g2' },
      });
      const hook = CAPTURED.find((c) => c.where === 'afterRead');
      expect(hook).toMatchObject({
        op: 'findAll',
        parent: { route: 'groups', param: 'id', id: 'g2' },
      });
    });

    it('gives afterRead the parent id on a single child', async () => {
      await controller.findOneChild_expense('g1', 'e1', {
        params: { id: 'g1' },
      });
      const hook = CAPTURED.find((c) => c.where === 'afterRead');
      expect(hook).toMatchObject({ op: 'findOne', parent: { id: 'g1' } });
    });
  });

  describe('a resource that declares its own parent', () => {
    let controller: any;

    beforeEach(async () => {
      const dir = join(tempDir, 'expense');
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'resource.json'),
        JSON.stringify({
          ...CHILD_JSON,
          parent: { route: 'groups', param: 'groupId' },
        }),
      );
      writeFileSync(join(dir, 'repository.ts'), CHILD_REPOSITORY);
      writeFileSync(join(dir, 'hooks.ts'), HOOKS);

      const [config] = await loadResourceConfigsFromDir(tempDir, '/api');
      const Cls = createCrudController(config as any, '/api');
      controller = new Cls(
        { resolve: () => undefined, entries: () => [] } as any,
        { getByRoute: async () => undefined } as any,
      );
    });

    it('names the param the resource chose, not `id`', async () => {
      await controller.create({ label: 'x' }, { params: { groupId: 'g7' } });
      const hook = CAPTURED.find((c) => c.where === 'beforeWrite');
      expect(hook.parent).toEqual({
        route: 'groups',
        param: 'groupId',
        id: 'g7',
      });
    });

    it('reaches afterRead too', async () => {
      await controller.findOne('e1', { params: { groupId: 'g7' } });
      const hook = CAPTURED.find((c) => c.where === 'afterRead');
      expect(hook.parent.id).toBe('g7');
    });
  });

  describe('a top-level resource', () => {
    it('leaves ctx.parent undefined rather than inventing one', async () => {
      const dir = join(tempDir, 'expense');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'resource.json'), JSON.stringify(CHILD_JSON));
      writeFileSync(
        join(dir, 'repository.ts'),
        'export default { findAll: async () => ({ data: [], count: 0 }), findOne: async () => ({ id: "e1" }), create: async (d) => d, update: async (i, d) => d, delete: async () => ({}) };',
      );
      writeFileSync(join(dir, 'hooks.ts'), HOOKS);

      const [config] = await loadResourceConfigsFromDir(tempDir, '/api');
      const Cls = createCrudController(config as any, '/api');
      const controller: any = new Cls(
        { resolve: () => undefined, entries: () => [] } as any,
        { getByRoute: async () => undefined } as any,
      );

      await controller.create({ label: 'x' }, { params: {} });
      const hook = CAPTURED.find((c) => c.where === 'beforeWrite');
      expect(hook.parent).toBeUndefined();
    });
  });
});

/**
 * Where a sub-resource's hooks file may live. The parent-scoped location came
 * first; the child's own directory was added because that is where `resource.json`
 * and `repository.ts` already sit, so a `hooks.ts` beside them was the obvious
 * guess — and was silently ignored.
 */
describe('sub-resource hook discovery', () => {
  let tempDir: string;

  const write = (opts: { inChildDir?: string; inParentHooks?: string }) => {
    const expenseDir = join(tempDir, 'groups', 'expense');
    mkdirSync(expenseDir, { recursive: true });
    writeFileSync(
      join(tempDir, 'groups', 'resource.json'),
      JSON.stringify({
        name: 'groups',
        route: 'groups',
        model: 'Group',
        tag: 'Group',
        operations: {},
        columns: {
          id: { idField: true },
          expense: {
            label: 'Expenses',
            fieldInput: { resource: './expense/resource.json' },
          },
        },
      }),
    );
    writeFileSync(join(expenseDir, 'resource.json'), JSON.stringify(CHILD_JSON));
    writeFileSync(join(expenseDir, 'repository.ts'), CHILD_REPOSITORY);
    if (opts.inChildDir) {
      writeFileSync(join(expenseDir, 'hooks.ts'), opts.inChildDir);
    }
    if (opts.inParentHooks) {
      mkdirSync(join(tempDir, 'groups', 'hooks'), { recursive: true });
      writeFileSync(
        join(tempDir, 'groups', 'hooks', 'expense.ts'),
        opts.inParentHooks,
      );
    }
  };

  const marker = (tag: string) =>
    `export default { beforeWrite: async (d, ctx) => { globalThis.__CAPTURED__.push({ where: '${tag}', parent: ctx.parent }); return d; } };`;

  const boot = async () => {
    const configs = await loadResourceConfigsFromDir(tempDir, '/api');
    const parent = configs.find((c) => c.name === 'groups');
    const Cls = createCrudController(parent as any, '/api');
    const prisma: any = {
      Group: { findMany: async () => [], count: async () => 0 },
    };
    return new Cls(
      { resolve: () => prisma, entries: () => [] } as any,
      { getByRoute: async () => undefined } as any,
    ) as any;
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-hook-discovery-'));
    resourceLoadErrorsRegistry.clear();
    CAPTURED.length = 0;
    (globalThis as any).__CAPTURED__ = CAPTURED;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete (globalThis as any).__CAPTURED__;
  });

  it('finds hooks.ts in the child’s own directory', async () => {
    write({ inChildDir: marker('child-dir') });
    const c = await boot();
    await c.createChild_expense('g1', { label: 'x' }, { params: { id: 'g1' } });
    expect(CAPTURED.map((x) => x.where)).toEqual(['child-dir']);
  });

  it('still finds the parent-scoped hooks/<name>.ts', async () => {
    write({ inParentHooks: marker('parent-hooks') });
    const c = await boot();
    await c.createChild_expense('g1', { label: 'x' }, { params: { id: 'g1' } });
    expect(CAPTURED.map((x) => x.where)).toEqual(['parent-hooks']);
  });

  it('prefers the parent-scoped one when both exist', async () => {
    write({ inChildDir: marker('child-dir'), inParentHooks: marker('parent-hooks') });
    const c = await boot();
    await c.createChild_expense('g1', { label: 'x' }, { params: { id: 'g1' } });
    expect(CAPTURED.map((x) => x.where)).toEqual(['parent-hooks']);
  });
});
