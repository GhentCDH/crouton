import { describe, expect, it } from 'vitest';

import { ResourceJsonSchema } from '@ghentcdh/crouton-core';

import { fromJson } from './json-adapter';

const PRISMA_RAW = {
  $schema: 'https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json',
  name: 'article',
  route: 'articles',
  tag: 'Articles',
  kind: 'prisma',
  operations: {
    findAll: true,
    findOne: true,
    create: true,
    update: true,
    delete: true,
  },
  columns: {
    id: { type: 'string', idField: true },
    title: { type: 'string' },
  },
};

describe('fromJson — source.flattening (dbTable/datasource)', () => {
  it('flattens source.dbTable → table and source.datasource → database', () => {
    const json = ResourceJsonSchema.parse({
      ...PRISMA_RAW,
      source: {
        model: 'Article',
        dbTable: 'articles_staging',
        datasource: 'archivedb',
        idType: 'number',
      },
    });
    const resource = fromJson(json, undefined, undefined);
    expect(resource.model).toBe('Article');
    expect(resource.table).toBe('articles_staging');
    expect(resource.database).toBe('archivedb');
    expect(resource.idType).toBe('number');
  });

  it('rejects the removed source.table / source.database keys at validation', () => {
    for (const legacy of [{ table: 'articles_staging' }, { database: 'archivedb' }]) {
      const result = ResourceJsonSchema.safeParse({
        ...PRISMA_RAW,
        source: { model: 'Article', ...legacy },
      });
      expect(result.success).toBe(false);
      expect(JSON.stringify(result.error?.issues)).toMatch(
        /moved to source\.(dbTable|datasource)/,
      );
    }
  });

  it('does not read source.table / source.database even if they slip past parsing', () => {
    // The schema strips these, but guard the adapter too: a parasitic object with the
    // removed keys must not get its table name / datasource silently picked up.
    const json = {
      ...ResourceJsonSchema.parse({ ...PRISMA_RAW, source: { model: 'Article' } }),
      source: { model: 'Article', table: 'legacy_table', database: 'legacy_db' },
    } as unknown as ReturnType<typeof ResourceJsonSchema.parse>;
    const resource = fromJson(json, undefined, undefined);
    expect(resource.table).toBeUndefined();
    expect(resource.database).toBeUndefined();
    expect(resource.model).toBe('Article');
  });
});