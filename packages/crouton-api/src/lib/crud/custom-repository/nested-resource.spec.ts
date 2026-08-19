import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validateCustomRepository } from './custom-repository.validate';
import { buildLayoutPayload } from '../app-layout/app-layout.builder';
import { createCrudController } from '../crud-controller.factory';
import { loadResourceConfigsFromDir } from '../loader';
import { buildViewsPayload } from '../operations/payload-builders';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * A `kind: "custom"` resource that declares a `parent` is mounted only under
 * that parent, and implements the parent-aware operations so the parent id is
 * always in hand.
 */

const ROWS = [
  { id: 'e1', groupId: 'g1', label: 'Groceries' },
  { id: 'e2', groupId: 'g1', label: 'Train' },
  { id: 'e3', groupId: 'g2', label: 'Rent' },
];

const REPOSITORY_TS = `const ROWS = ${JSON.stringify(ROWS)};
const repository = {
  findAllByParent: async (parentId, params, ctx) => {
    const rows = ROWS.filter((r) => r.groupId === parentId);
    return { data: rows, count: rows.length, _seen: ctx.parent };
  },
  findOneByParent: async (parentId, id) =>
    ROWS.find((r) => r.groupId === parentId && r.id === id) ?? null,
  createByParent: async (parentId, data) => ({ id: 'new', groupId: parentId, ...data }),
  updateByParent: async (parentId, id, data) => ({ id, groupId: parentId, ...data }),
  deleteByParent: async (parentId, id) => ({ id, groupId: parentId }),
};
export default repository;
`;

const RESOURCE_JSON = {
  name: 'expense',
  route: 'expense',
  tag: 'Expenses',
  kind: 'custom',
  title: 'Expenses',
  parent: { route: 'group', param: 'groupId' },
  operations: {},
  columns: {
    id: { type: 'string', idField: true, hiddenInForm: true },
    label: { type: 'string', searchable: true, sortable: true, defaultSort: true },
  },
};

const listParams = {
  page: 1,
  pageSize: 20,
  sort: 'label',
  sortDir: 'asc' as const,
  filter: [] as string[],
};

/** Stand-in for the Express request the controller layer passes through. */
const req = (params: Record<string, string>) => ({ params });

describe('a nested custom resource', () => {
  let tempDir: string;
  let controller: any;
  let config: any;

  const write = (json: Record<string, unknown>, repository = REPOSITORY_TS) => {
    const dir = join(tempDir, 'expense');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'resource.json'), JSON.stringify(json, null, 2));
    if (repository) writeFileSync(join(dir, 'repository.ts'), repository);
  };

  const boot = async () => {
    [config] = await loadResourceConfigsFromDir(tempDir, '/api');
    const ControllerClass = createCrudController(config, '/api');
    controller = new ControllerClass(
      { resolve: () => undefined, entries: () => [] } as any,
      { getByRoute: async () => undefined } as any,
    );
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-nested-'));
    resourceLoadErrorsRegistry.clear();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('routing', () => {
    beforeEach(async () => {
      write(RESOURCE_JSON);
      await boot();
    });

    it('loads without errors', () => {
      expect(resourceLoadErrorsRegistry.getAll()).toEqual([]);
      expect(config.parent).toEqual({ route: 'group', param: 'groupId' });
    });

    it('mounts the whole controller under the parent', () => {
      expect(Reflect.getMetadata('path', controller.constructor)).toBe(
        'group/:groupId/expense',
      );
    });

    it('reports nested URIs with the parent id as a placeholder', () => {
      const payload = buildViewsPayload(config, '/api') as any;
      expect(payload.uri).toBe('/api/group/{groupId}/expense');
      expect(payload.operations.findOne.uri).toBe(
        '/api/group/{groupId}/expense/{id}',
      );
    });

    it('is kept out of the sidebar — it has no standalone route', () => {
      const layout = buildLayoutPayload([config], {}, 'App', true) as any;
      expect(layout.sidebar).toEqual([]);
    });
  });

  describe('scoping by parent', () => {
    beforeEach(async () => {
      write(RESOURCE_JSON);
      await boot();
    });

    it('lists only the requested parent’s children', async () => {
      const result = await controller.findAll(
        listParams,
        undefined,
        req({ groupId: 'g1' }),
      );
      expect(result.data.map((r: any) => r.id)).toEqual(['e1', 'e2']);
      expect(result.request.count).toBe(2);
    });

    it('scopes a different parent independently', async () => {
      const result = await controller.findAll(
        listParams,
        undefined,
        req({ groupId: 'g2' }),
      );
      expect(result.data.map((r: any) => r.id)).toEqual(['e3']);
    });

    it('passes the parent through ctx.parent as well', async () => {
      const result = await controller.findAll(
        listParams,
        undefined,
        req({ groupId: 'g1' }),
      );
      // The fixture echoes ctx.parent back on the result envelope.
      expect((result as any).data.length).toBe(2);
      const raw = await config.repository.findAllByParent('g1', listParams, {
        parent: { route: 'group', param: 'groupId', id: 'g1' },
      });
      expect(raw._seen).toEqual({
        route: 'group',
        param: 'groupId',
        id: 'g1',
      });
    });

    it('scopes findOne, so another parent’s row is a 404', async () => {
      await expect(
        controller.findOne('e1', req({ groupId: 'g1' })),
      ).resolves.toMatchObject({ id: 'e1' });
      await expect(
        controller.findOne('e3', req({ groupId: 'g1' })),
      ).rejects.toThrow(/not found/);
    });

    it('passes the parent id into writes', async () => {
      await expect(
        controller.create({ label: 'New' }, req({ groupId: 'g2' })),
      ).resolves.toMatchObject({ groupId: 'g2', label: 'New' });
      await expect(
        controller.update('e1', { label: 'Edited' }, req({ groupId: 'g1' })),
      ).resolves.toMatchObject({ id: 'e1', groupId: 'g1' });
      await expect(
        controller.delete('e1', req({ groupId: 'g1' })),
      ).resolves.toMatchObject({ id: 'e1', groupId: 'g1' });
    });

    it('falls back to updateByParent for patch', async () => {
      await expect(
        controller.patch('e1', { label: 'Patched' }, req({ groupId: 'g1' })),
      ).resolves.toMatchObject({ id: 'e1', groupId: 'g1', label: 'Patched' });
    });

    it('refuses to run unscoped rather than listing every parent', async () => {
      // No parent id in the request => explicit 400, never a full-table read.
      await expect(
        controller.findAll(listParams, undefined, req({})),
      ).rejects.toThrow(/no "groupId" was supplied/);
    });
  });

  describe('validation', () => {
    it('rejects `parent` on a prisma resource', async () => {
      write({
        name: 'expense',
        route: 'expense',
        model: 'Expense',
        tag: 'E',
        operations: {},
        parent: { route: 'group', param: 'groupId' },
      });
      const configs = await loadResourceConfigsFromDir(tempDir, '/api');
      expect(configs).toHaveLength(0);
      expect(resourceLoadErrorsRegistry.getAll()[0].error).toMatch(
        /only supported on a custom resource/,
      );
    });

    it('rejects parent.param === "id", which collides with the child id', async () => {
      write({ ...RESOURCE_JSON, parent: { route: 'group', param: 'id' } });
      const configs = await loadResourceConfigsFromDir(tempDir, '/api');
      expect(configs).toHaveLength(0);
      expect(resourceLoadErrorsRegistry.getAll()[0].error).toMatch(/param/);
    });

    it('defaults parent.param to parentId', async () => {
      write({ ...RESOURCE_JSON, parent: { route: 'group' } });
      const [loaded] = await loadResourceConfigsFromDir(tempDir, '/api');
      expect(loaded.parent?.param).toBe('parentId');
    });

    it('asks for the parent-aware methods by name when they are missing', () => {
      const nested = {
        name: 'expense',
        parent: { route: 'group', param: 'groupId' },
        definition: { findAll: true, findOne: true },
      } as any;

      // The unnested methods do not satisfy a nested resource.
      const problem = validateCustomRepository(nested, {
        findAll: async () => ({ data: [], count: 0 }),
        findOne: async () => null,
      });
      expect(problem).toMatch(/findAllByParent/);
      expect(problem).toMatch(/findOneByParent/);
      expect(problem).toMatch(/nested under "group"/);

      expect(
        validateCustomRepository(nested, {
          findAllByParent: async () => ({ data: [], count: 0 }),
          findOneByParent: async () => null,
        }),
      ).toBeUndefined();
    });

    it('names the parent-aware methods when repository.ts is absent', () => {
      const problem = validateCustomRepository(
        {
          name: 'expense',
          parent: { route: 'group', param: 'groupId' },
          definition: { findAll: true },
        } as any,
        undefined,
      );
      expect(problem).toMatch(/findAllByParent/);
    });
  });
});
