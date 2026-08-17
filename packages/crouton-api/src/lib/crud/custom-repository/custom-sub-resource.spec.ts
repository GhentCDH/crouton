import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCrudController } from '../crud-controller.factory';
import { loadResourceConfigsFromDir } from '../loader';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * A `kind: "custom"` child nested inside a **prisma** parent, the layout where
 * the child's resource.json lives in a subdirectory of the parent and the
 * parent declares it with a relation column:
 *
 *   resources/groups/resource.json          ← prisma, relation column → ./expense
 *   resources/groups/expense/resource.json  ← kind: custom
 *   resources/groups/expense/repository.ts
 *
 * Routes are served by the parent's controller (`groups/:id/expense`), but the
 * data comes from the child's repository rather than `prisma[childModel]`.
 */

const ROWS = [
  { id: 'e1', groupId: 'g1', label: 'Groceries', amount: 42.5 },
  { id: 'e2', groupId: 'g1', label: 'Train', amount: 18 },
  { id: 'e3', groupId: 'g2', label: 'Rent', amount: 800 },
];

const CHILD_REPOSITORY = `const ROWS = ${JSON.stringify(ROWS)};
const repository = {
  findAllByParent: async (groupId, params, ctx) => {
    const rows = ROWS.filter((r) => r.groupId === groupId);
    return { data: rows.slice(ctx.offset, ctx.offset + params.pageSize), count: rows.length };
  },
  findOneByParent: async (groupId, id) =>
    ROWS.find((r) => r.groupId === groupId && r.id === id) ?? null,
  createByParent: async (groupId, data) => ({ id: 'e9', groupId, ...data }),
  updateByParent: async (groupId, id, data) => ({ id, groupId, ...data }),
  deleteByParent: async (groupId, id) => ({ id, groupId }),
};
export default repository;
`;

const PARENT_JSON = {
  name: 'groups',
  route: 'groups',
  model: 'Group',
  tag: 'Group',
  operations: {},
  columns: {
    id: { idField: true },
    name: { searchable: true },
    expenses: {
      label: 'Expenses',
      hiddenInTable: true,
      fieldInput: {
        format: 'relation',
        relationType: 'oneToMany',
        resource: './expense/resource.json',
        foreignKey: 'group_id',
      },
    },
  },
};

const CHILD_JSON = {
  name: 'expense',
  route: 'expense',
  tag: 'Expense',
  kind: 'custom',
  title: 'Expenses',
  operations: {},
  columns: {
    id: { type: 'string', idField: true, hiddenInForm: true },
    label: { type: 'string', searchable: true, sortable: true, defaultSort: true },
    amount: { type: 'number', sortable: true },
  },
};

const listParams = {
  page: 1,
  pageSize: 20,
  sort: 'label',
  sortDir: 'asc' as const,
  filter: [] as string[],
};

describe('a custom sub-resource inside a prisma parent', () => {
  let tempDir: string;
  let controller: any;
  let parent: any;

  const write = (
    childJson: Record<string, unknown> = CHILD_JSON,
    childRepository: string | null = CHILD_REPOSITORY,
  ) => {
    const groupsDir = join(tempDir, 'groups');
    const expenseDir = join(groupsDir, 'expense');
    mkdirSync(expenseDir, { recursive: true });
    writeFileSync(
      join(groupsDir, 'resource.json'),
      JSON.stringify(PARENT_JSON, null, 2),
    );
    writeFileSync(
      join(expenseDir, 'resource.json'),
      JSON.stringify(childJson, null, 2),
    );
    if (childRepository) {
      writeFileSync(join(expenseDir, 'repository.ts'), childRepository);
    }
  };

  const boot = async () => {
    const configs = await loadResourceConfigsFromDir(tempDir, '/api');
    parent = configs.find((c) => c.name === 'groups');
    const ControllerClass = createCrudController(parent, '/api');
    // The parent IS prisma-backed, so its own model must exist — the child's
    // does not, which is the whole point.
    const prisma: any = {
      Group: { findMany: async () => [], count: async () => 0 },
    };
    controller = new ControllerClass(
      { resolve: () => prisma, entries: () => [] } as any,
      { getByRoute: async () => undefined } as any,
    );
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-custom-sub-'));
    resourceLoadErrorsRegistry.clear();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('wiring', () => {
    beforeEach(async () => {
      write();
      await boot();
    });

    it('loads the parent, with the child as a sub-resource', () => {
      expect(resourceLoadErrorsRegistry.getAll()).toEqual([]);
      expect(parent.subResources).toHaveLength(1);
    });

    it('marks the child custom and records its directory', () => {
      const [sub] = parent.subResources;
      expect(sub.childKind).toBe('custom');
      expect(sub.childDir).toContain(join('groups', 'expense'));
    });

    it('does not invent a Prisma model for the child', () => {
      expect(parent.subResources[0].childModel).toBe('');
    });

    it('attaches the child’s repository', () => {
      expect(typeof parent.subResources[0].repository.findAllByParent).toBe(
        'function',
      );
    });

    it('registers the nested routes on the parent controller', () => {
      const methods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(controller),
      );
      expect(methods).toContain('getSchemas_expense');
      expect(methods).toContain('findAllBy_expense');
      expect(methods).toContain('findOneChild_expense');
    });

    it('serves the child’s schemas endpoint', async () => {
      const payload = await controller.getSchemas_expense();
      expect(payload.route).toBe('expense');
      expect(Object.keys(payload.schemas)).toContain('table');
    });
  });

  describe('reads delegate to the child repository', () => {
    beforeEach(async () => {
      write();
      await boot();
    });

    it('lists only the requested group’s expenses', async () => {
      const result = await controller.findAllBy_expense(
        listParams,
        undefined,
        'g1',
        { params: { id: 'g1' } },
      );
      expect(result.data.map((r: any) => r.id)).toEqual(['e1', 'e2']);
      expect(result.request.count).toBe(2);
    });

    it('scopes a different group independently', async () => {
      const result = await controller.findAllBy_expense(
        listParams,
        undefined,
        'g2',
        { params: { id: 'g2' } },
      );
      expect(result.data.map((r: any) => r.id)).toEqual(['e3']);
    });

    it('fetches one child, scoped to its parent', async () => {
      await expect(
        controller.findOneChild_expense('g1', 'e1', { params: { id: 'g1' } }),
      ).resolves.toMatchObject({ id: 'e1', label: 'Groceries' });
    });

    it('404s for a child belonging to another group', async () => {
      await expect(
        controller.findOneChild_expense('g1', 'e3', { params: { id: 'g1' } }),
      ).rejects.toThrow(/not found/);
    });
  });

  describe('writes delegate to the child repository', () => {
    beforeEach(async () => {
      write();
      await boot();
    });

    it('creates with the parent id', async () => {
      await expect(
        controller.createChild_expense('g2', { label: 'New' }, {
          params: { id: 'g2' },
        }),
      ).resolves.toMatchObject({ groupId: 'g2', label: 'New' });
    });

    it('updates, recovering the parent id from the request', async () => {
      // updateChild is called without a parentId — it comes off request.params.id.
      await expect(
        controller.updateChild_expense('g1', 'e1', { label: 'Edited' }, {
          params: { id: 'g1' },
        }),
      ).resolves.toMatchObject({ id: 'e1', groupId: 'g1', label: 'Edited' });
    });

    it('deletes with the parent id', async () => {
      // Handler signature is (childId, parentId, req) — see register-delete.
      await expect(
        controller.deleteChild_expense('e1', 'g1', { params: { id: 'g1' } }),
      ).resolves.toMatchObject({ id: 'e1', groupId: 'g1' });
    });
  });

  describe('failure modes are actionable', () => {
    it('names the missing method when the child does not implement it', async () => {
      write(CHILD_JSON, 'export default { findAllByParent: async () => ({ data: [], count: 0 }) };');
      await boot();
      await expect(
        controller.findOneChild_expense('g1', 'e1', { params: { id: 'g1' } }),
      ).rejects.toThrow(/does not implement "findOneByParent"/);
    });

    it('says so when the child has no repository.ts at all', async () => {
      write(CHILD_JSON, null);
      await boot();
      await expect(
        controller.findAllBy_expense(listParams, undefined, 'g1', {
          params: { id: 'g1' },
        }),
      ).rejects.toThrow(/no repository.ts was loaded/);
    });

    it('refuses a write with no parent id rather than guessing', async () => {
      write();
      await boot();
      await expect(
        controller.updateChild_expense('g1', 'e1', { label: 'x' }, {
          params: {},
        }),
      ).rejects.toThrow(/requires a parent id/);
    });
  });

  describe('the child delete route binds the parent id', () => {
    it('scopes a prisma child delete by its foreign key', async () => {
      write(
        {
          name: 'expense',
          route: 'expense',
          model: 'Expense',
          tag: 'Expense',
          operations: {},
          columns: { id: { idField: true }, label: {} },
        },
        null,
      );
      const configs = await loadResourceConfigsFromDir(tempDir, '/api');
      parent = configs.find((c) => c.name === 'groups');
      const ControllerClass = createCrudController(parent, '/api');
      const deleted: any[] = [];
      const prisma: any = {
        Group: { findMany: async () => [], count: async () => 0 },
        expenses: {
          findFirst: async () => ({ id: 'e1' }),
          deleteMany: async (args: any) => {
            deleted.push(args);
            return { count: 1 };
          },
        },
      };
      const c: any = new ControllerClass(
        { resolve: () => prisma, entries: () => [] } as any,
        { getByRoute: async () => undefined } as any,
      );

      await c.deleteChild_expense('e1', 'g1', { params: { id: 'g1' } });

      // Without the parent id bound, this where clause carried only the child
      // id and a child of another group could be deleted.
      expect(deleted[0].where).toMatchObject({ id: 'e1', group_id: 'g1' });
    });
  });

  describe('a prisma child still uses Prisma', () => {
    it('keeps childModel and does not delegate', async () => {
      write({
        name: 'expense',
        route: 'expense',
        model: 'Expense',
        tag: 'Expense',
        operations: {},
        columns: { id: { idField: true }, label: {} },
      }, null);
      await boot();
      const [sub] = parent.subResources;
      expect(sub.childKind).toBe('prisma');
      expect(sub.childModel).toBe('expenses');
      expect(sub.repository).toBeUndefined();
    });
  });
});
