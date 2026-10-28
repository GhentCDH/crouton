import { describe, expect, it } from 'vitest';

import { RESOURCE_SCHEMA_URL, ResourceJsonSchema, withResourceHeader  } from '@ghentcdh/crouton-core';

import { type CustomResourceScaffoldInput, buildCustomResourceFiles } from './custom-resource-scaffold';

const build = (over: Partial<CustomResourceScaffoldInput> = {}) =>
  buildCustomResourceFiles({
    name: 'zotero_item',
    resourcesDir: 'apps/backend/src/app/resources',
    ...over,
  });

const jsonOf = (files: { path: string; contents: string }[]): Record<string, unknown> =>
  JSON.parse(files.find((f) => f.path.endsWith('resource.json'))!.contents) as Record<string, unknown>;

describe('buildCustomResourceFiles', () => {
  it('emits resource.json and repository.ts under the resource dir', () => {
    const { files } = build();
    expect(files.map((f) => f.path)).toEqual([
      'apps/backend/src/app/resources/zotero_item/resource.json',
      'apps/backend/src/app/resources/zotero_item/repository.ts',
    ]);
  });

  it('marks both files create-only so hand edits are never clobbered', () => {
    for (const file of build().files) {
      expect(file.action).toBe('create');
    }
  });

  it('stamps the schema header and kind', () => {
    const json = jsonOf(build().files);
    expect(json.$schema).toBe(RESOURCE_SCHEMA_URL);
    expect(json.schemaVersion).toBeGreaterThan(0);
    expect(json.kind).toBe('custom');
  });

  it('produces a resource.json that validates against the real schema', () => {
    const result = ResourceJsonSchema.safeParse(jsonOf(build().files));
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it('omits model — a custom resource has none', () => {
    expect(jsonOf(build().files).model).toBeUndefined();
  });

  it('derives route/tag/title from the name', () => {
    const json = jsonOf(build().files);
    expect(json.route).toBe('zotero_item');
    expect(json.tag).toBe('Zotero item');
    expect(json.title).toBe('Zotero item');
  });

  it('honours explicit route/tag/title/database', () => {
    const json = jsonOf(
      build({
        route: 'zotero-items',
        tag: 'Zotero',
        title: 'Zotero items',
        database: 'maindb',
      }).files,
    );
    expect(json).toMatchObject({
      route: 'zotero-items',
      tag: 'Zotero',
      title: 'Zotero items',
      source: { datasource: 'maindb' },
    });
  });

  it('enables every operation, so the stub must implement them all', () => {
    expect(jsonOf(build().files).operations).toEqual({
      findAll: true,
      findOne: true,
      create: true,
      update: true,
      patch: true,
      delete: true,
    });
  });

  it('gives every column a type', () => {
    const { columns } = jsonOf(build().files);
    for (const [id, column] of Object.entries<Record<string, unknown>>(columns as Record<string, Record<string, unknown>>)) {
      expect(column['type'], id).toBeDefined();
    }
  });

  it('switches the id column type with idType', () => {
    const stringId = jsonOf(build().files);
    const stringCols = stringId['columns'] as Record<string, Record<string, unknown>>;
    expect(stringCols['id']['type']).toBe('string');
    expect(stringId['idType']).toBeUndefined();
    expect((stringId['source'] as Record<string, unknown> | undefined)?.['idType']).toBeUndefined();

    const numberId = jsonOf(build({ idType: 'number' }).files);
    const numberCols = numberId['columns'] as Record<string, Record<string, unknown>>;
    expect(numberCols['id']['type']).toBe('integer');
    expect((numberId['source'] as Record<string, unknown> | undefined)?.['idType']).toBe('number');
  });

  it('stubs a typed repository with every operation', () => {
    const repository = build().files.find((f) =>
      f.path.endsWith('repository.ts'),
    )!.contents;
    expect(repository).toContain(
      'import type { CustomRepository } from \'@ghentcdh/crouton-api\'',
    );
    expect(repository).toContain('export default repository');
    for (const op of ['findAll', 'findOne', 'create', 'update', 'delete']) {
      expect(repository, op).toContain(`${op}: async`);
    }
  });

  it('tells the user what to do next', () => {
    const { notes } = build();
    expect(notes.join('\n')).toMatch(/repository\.ts/);
    expect(notes.join('\n')).toMatch(/update resources/);
  });
});

describe('withResourceHeader and kind', () => {
  it('preserves kind and hoists it into the header block', () => {
    const out = withResourceHeader({
      name: 'x',
      route: 'x',
      tag: 'X',
      kind: 'custom',
      operations: {},
    } as Record<string, unknown>);
    expect(Object.keys(out).slice(0, 3)).toEqual([
      '$schema',
      'schemaVersion',
      'kind',
    ]);
    expect(out.kind).toBe('custom');
  });

  it('does not invent a kind for a prisma resource', () => {
    const out = withResourceHeader({
      name: 'x',
      route: 'x',
      model: 'X',
      tag: 'X',
      operations: {},
    } as Record<string, unknown>);
    expect('kind' in out).toBe(false);
  });
});
