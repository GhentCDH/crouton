import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validateCustomRepository } from './custom-repository.validate';
import { loadResourceConfigsFromDir } from '../loader';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const customResource = {
  name: 'zotero_item',
  route: 'zotero-items',
  tag: 'Zotero',
  kind: 'custom',
  operations: {},
  columns: {
    id: { type: 'string', idField: true, hiddenInForm: true },
    title: { type: 'string', searchable: true, sortable: true },
    metadata: {
      displayKey: 'name',
      type: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
      },
    },
  },
};

const REPOSITORY_TS = `const repository = {
  findAll: async () => ({ data: [{ id: 'a', title: 'A' }], count: 1 }),
  findOne: async (id) => ({ id, title: 'A' }),
  create: async (data) => ({ id: 'new', ...data }),
  update: async (id, data) => ({ id, ...data }),
  delete: async (id) => ({ id }),
};
export default repository;
`;

describe('custom resource loading', () => {
  let tempDir: string;

  const writeResource = (
    dir: string,
    json: Record<string, unknown>,
    files: Record<string, string> = {},
  ) => {
    const resourceDir = join(tempDir, dir);
    mkdirSync(resourceDir, { recursive: true });
    writeFileSync(
      join(resourceDir, 'resource.json'),
      JSON.stringify(json, null, 2),
    );
    for (const [name, contents] of Object.entries(files)) {
      writeFileSync(join(resourceDir, name), contents);
    }
    return resourceDir;
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'crouton-custom-test-'));
    resourceLoadErrorsRegistry.clear();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads a custom resource with no schema.ts', async () => {
    writeResource('zotero_item', customResource, {
      'repository.ts': REPOSITORY_TS,
    });

    const configs = await loadResourceConfigsFromDir(tempDir);

    expect(configs).toHaveLength(1);
    expect(resourceLoadErrorsRegistry.getAll()).toEqual([]);
    expect(configs[0].kind).toBe('custom');
    expect(configs[0].model).toBeUndefined();
  });

  it('builds views from the column types', async () => {
    writeResource('zotero_item', customResource, {
      'repository.ts': REPOSITORY_TS,
    });

    const [config] = await loadResourceConfigsFromDir(tempDir);
    const views = config.views!;

    expect(Object.keys(views).sort()).toEqual(['form', 'table', 'view']);
    const properties = (views.table.json_schema as any).properties;
    expect(properties.title.type).toBe('string');
    expect(properties.metadata).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' } },
    });
  });

  it('attaches the loaded repository to the config', async () => {
    writeResource('zotero_item', customResource, {
      'repository.ts': REPOSITORY_TS,
    });

    const [config] = await loadResourceConfigsFromDir(tempDir);
    expect(typeof config.repository?.findAll).toBe('function');
  });

  it('registers every enabled operation in the definition', async () => {
    writeResource('zotero_item', customResource, {
      'repository.ts': REPOSITORY_TS,
    });

    const [config] = await loadResourceConfigsFromDir(tempDir);
    const definition = config.definition as Record<string, unknown>;
    for (const op of ['findAll', 'findOne', 'create', 'update', 'patch', 'delete']) {
      expect(definition[op], op).toBeDefined();
    }
  });

  it('rejects a custom resource that declares a model', async () => {
    writeResource('zotero_item', { ...customResource, model: 'ZoteroItem' }, {
      'repository.ts': REPOSITORY_TS,
    });

    const configs = await loadResourceConfigsFromDir(tempDir);

    expect(configs).toHaveLength(0);
    expect(resourceLoadErrorsRegistry.getAll()[0].error).toMatch(/model/i);
  });

  it('rejects a custom resource with an untyped column', async () => {
    writeResource(
      'zotero_item',
      {
        ...customResource,
        columns: { id: { type: 'string', idField: true }, title: {} },
      },
      { 'repository.ts': REPOSITORY_TS },
    );

    const configs = await loadResourceConfigsFromDir(tempDir);

    expect(configs).toHaveLength(0);
    expect(resourceLoadErrorsRegistry.getAll()[0].error).toMatch(/type/i);
  });

  it('loads but reports a resource whose repository.ts is broken', async () => {
    writeResource('zotero_item', customResource, {
      'repository.ts': 'export default {',
    });

    const configs = await loadResourceConfigsFromDir(tempDir);

    // The config still loads (so the status page can describe it), but the
    // import failure is recorded rather than silently looking like a missing file.
    expect(configs).toHaveLength(1);
    expect(configs[0].repository).toBeUndefined();
    const errors = resourceLoadErrorsRegistry.getAll();
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toMatch(/Failed to import repository/);
  });

  it('leaves repository undefined when the file is absent', async () => {
    writeResource('zotero_item', customResource);

    const [config] = await loadResourceConfigsFromDir(tempDir);
    expect(config.repository).toBeUndefined();
    // Absence is not an import error — it is caught by validateCustomRepository.
    expect(resourceLoadErrorsRegistry.getAll()).toEqual([]);
  });

  it('ignores a repository.ts on a prisma resource', async () => {
    writeResource(
      'book',
      {
        name: 'book',
        route: 'books',
        model: 'Book',
        tag: 'Book',
        operations: {},
        columns: { id: { idField: true } },
      },
      { 'repository.ts': REPOSITORY_TS },
    );

    const [config] = await loadResourceConfigsFromDir(tempDir);
    expect(config.repository).toBeUndefined();
  });
});

describe('validateCustomRepository', () => {
  const config = {
    name: 'zotero_item',
    definition: {
      findAll: true,
      findOne: true,
      create: true,
      patch: true,
    },
  } as any;

  it('passes when every enabled operation is implemented', () => {
    expect(
      validateCustomRepository(config, {
        findAll: async () => ({ data: [], count: 0 }),
        findOne: async () => null,
        create: async () => ({}),
        patch: async () => ({}),
      }),
    ).toBeUndefined();
  });

  it('accepts update in place of patch', () => {
    expect(
      validateCustomRepository(config, {
        findAll: async () => ({ data: [], count: 0 }),
        findOne: async () => null,
        create: async () => ({}),
        update: async () => ({}),
      }),
    ).toBeUndefined();
  });

  it('names the missing operations', () => {
    const problem = validateCustomRepository(config, {
      findAll: async () => ({ data: [], count: 0 }),
    });
    expect(problem).toMatch(/findOne/);
    expect(problem).toMatch(/create/);
    expect(problem).not.toMatch(/findAll/);
  });

  it('explains how to create the file when it is missing', () => {
    const problem = validateCustomRepository(config, undefined);
    expect(problem).toMatch(/repository\.ts/);
    expect(problem).toMatch(/findAll, findOne, create, patch/);
  });

  it('ignores operations the resource has disabled', () => {
    const readOnly = {
      name: 'zotero_item',
      definition: { findAll: true },
    } as any;
    expect(
      validateCustomRepository(readOnly, {
        findAll: async () => ({ data: [], count: 0 }),
      }),
    ).toBeUndefined();
  });
});
