import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';

import { createCrudController } from '../crud-controller.factory';
import type { DataSourceRegistry } from '../data-access/adapter';
import { loadResourceConfigsFromDir } from '../loader';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import type { ResourceConfigRegistry } from '../resource-config.registry';
import { invalid } from '../test-utils';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type MockController = Record<
  string,
  (...args: unknown[]) => Promise<Record<string, unknown>>
> & {
  constructor: new (...args: unknown[]) => unknown;
};
type SchemaPayload = {
  operations: Record<string, Record<string, unknown>>;
  schemas: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * End-to-end check that a custom resource is served exactly like a prisma one:
 * the same controller factory, the same `/schemas` payload shape, and the same
 * `{ data, request }` list envelope — with data coming from `repository.ts`.
 *
 * Exercised through the generated controller class rather than an HTTP server,
 * so no extra test dependency is needed.
 */

const ROWS = [
  { id: 'a', title: 'Alpha', metadata: { id: 't1', name: 'Article' } },
  { id: 'b', title: 'Beta', metadata: { id: 't2', name: 'Book' } },
];

const REPOSITORY_TS = `const ROWS = ${JSON.stringify(ROWS)};
const repository = {
  findAll: async (params, ctx) => ({
    data: ROWS.slice(ctx.offset, ctx.offset + params.pageSize),
    count: ROWS.length,
  }),
  findOne: async (id) => ROWS.find((r) => r.id === id) ?? null,
  create: async (data) => ({ id: 'c', ...data }),
  update: async (id, data) => ({ id, ...data }),
  delete: async (id) => ({ id }),
};
export default repository;
`;

const RESOURCE_JSON = {
  name: 'zotero_item',
  route: 'zotero-items',
  tag: 'Zotero',
  kind: 'custom',
  title: 'Zotero items',
  operations: {},
  schemaVersion: CURRENT_RESOURCE_VERSION,
  columns: {
    id: { type: 'string', idField: true, hiddenInForm: true },
    title: { type: 'string' },
    metadata: {
      displayKey: 'name',
      type: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
      },
    },
  },
  layout: {
    table: {
      filterFields: ['title'],
      items: [{ id: 'title', sortable: true, defaultSort: true }, 'metadata'],
    },
  },
};

describe('custom resource served through the generated controller', () => {
  let tempDir: string;
  let controller: MockController;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-custom-ctrl-'));
    const dir = join(tempDir, 'zotero_item');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'resource.json'),
      JSON.stringify(RESOURCE_JSON, null, 2),
    );
    writeFileSync(join(dir, 'repository.ts'), REPOSITORY_TS);
    resourceLoadErrorsRegistry.clear();

    const [config] = await loadResourceConfigsFromDir(tempDir, '/api');
    const ControllerClass = createCrudController(config, '/api');

    // A project of only custom resources has no datasources; resolve() throws
    // and the controller must tolerate that.
    const registry = invalid<DataSourceRegistry>({
      resolve: () => {
        throw new Error('No default data source configured');
      },
      entries: () => [],
    });
    const configRegistry = invalid<ResourceConfigRegistry>({ getByRoute: async () => undefined });
    controller = invalid<MockController>(new ControllerClass(registry, configRegistry));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('mounts on the resource route', () => {
    // 'path' is Nest's PATH_METADATA key, referenced literally to avoid a deep
    // import of @nestjs/common/constants.
    expect(Reflect.getMetadata('path', controller.constructor)).toBe(
      'zotero-items',
    );
  });

  it('names the controller after the resource', () => {
    expect(controller.constructor.name).toBe('Zotero_itemController');
  });

  it('registers the CRUD methods', () => {
    for (const method of [
      'findAll',
      'findOne',
      'create',
      'update',
      'patch',
      'delete',
      'getSchemas',
    ]) {
      expect(typeof controller[method], method).toBe('function');
    }
  });

  it('serves findAll with the standard list envelope', async () => {
    const result = await controller.findAll({
      page: 1,
      pageSize: 20,
      sort: 'title',
      sortDir: 'asc',
      filter: [],
    });

    expect(result.data).toEqual(ROWS);
    expect(result.request).toMatchObject({
      count: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      sort: 'title',
      sortDir: 'asc',
    });
  });

  it('passes pagination through as an offset', async () => {
    const result = await controller.findAll({
      page: 2,
      pageSize: 1,
      sort: 'title',
      sortDir: 'asc',
      filter: [],
    });

    expect(result.data).toEqual([ROWS[1]]);
    expect(result.request).toMatchObject({ count: 2, totalPages: 2 });
  });

  it('serves findOne as a bare object', async () => {
    await expect(controller.findOne('a')).resolves.toEqual(ROWS[0]);
  });

  it('404s on an unknown id', async () => {
    await expect(controller.findOne('zzz')).rejects.toThrow(/not found/);
  });

  it('serves a /schemas payload with the frontend contract', async () => {
    const payload = await controller.getSchemas() as SchemaPayload;

    expect(payload).toMatchObject({
      id: 'zotero_item',
      route: 'zotero-items',
      title: 'Zotero items',
      idField: 'id',
      uri: '/api/zotero-items',
    });
    expect(payload.operations.findAll).toMatchObject({
      uri: '/api/zotero-items',
      method: 'get',
    });
    expect(payload.operations.findOne).toMatchObject({
      uri: '/api/zotero-items/{id}',
      method: 'get',
    });
    expect(Object.keys(payload.schemas).sort()).toEqual([
      'form',
      'table',
      'view',
    ]);
  });

  it('describes the object column in the table schema and ui', async () => {
    const result = await controller.getSchemas() as SchemaPayload;
    const schemas = result['schemas'] as Record<string, Record<string, unknown>>;

    // The payload renames json_schema/ui_schema to data/ui — same contract the
    // frontend's FormDefResponseZ validates.
    const tableSchema = schemas['table'] as Record<string, unknown>;
    expect((tableSchema['data'] as Record<string, Record<string, unknown>>)['properties']['metadata']).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
    const tableUiEl = (tableSchema['ui'] as Record<string, unknown>);
    const element = (tableUiEl['elements'] as Record<string, unknown>[]).find(
      (e: Record<string, unknown>) => e['scope'] === '#/properties/metadata',
    );
    expect((element as Record<string, unknown>)['type']).toBe('RecordCell');
    expect(((element as Record<string, unknown>)['options'] as Record<string, unknown>)['label']).toBe('Metadata');
  });

  it('reports the table default sort', async () => {
    const result2 = await controller.getSchemas() as SchemaPayload;
    const schemas2 = result2['schemas'] as Record<string, Record<string, unknown>>;
    const tableUi = schemas2['table']['ui'] as Record<string, unknown>;
    const tableNode = tableUi?.['type'] === 'Table' ? tableUi : (tableUi?.['elements'] as Record<string, unknown>[] | undefined)?.find((e: Record<string, unknown>) => e['type'] === 'Table');
    expect((tableNode?.['options'] as Record<string, unknown> | undefined)?.['defaultSortId']).toBe('title');
  });

  it('routes writes to the repository', async () => {
    await expect(controller.create({ title: 'Gamma' })).resolves.toEqual({
      id: 'c',
      title: 'Gamma',
    });
    await expect(controller.update('a', { title: 'Alpha 2' })).resolves.toEqual(
      {
        id: 'a',
        title: 'Alpha 2',
      },
    );
    await expect(controller.delete('a')).resolves.toEqual({ id: 'a' });
  });
});
