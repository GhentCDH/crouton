import { describe, expect, it } from 'vitest';

import { ResourceJsonSchema } from './ResourceJson.schema';

const base = {
  name: 'zotero_item',
  route: 'zotero-items',
  tag: 'Zotero',
  operations: {},
};

const issuePaths = (result: { error?: { issues: { path: unknown[] }[] } }) =>
  (result.error?.issues ?? []).map((i) => i.path.join('.'));

describe('resource.json kind', () => {
  it('defaults to prisma', () => {
    const parsed = ResourceJsonSchema.parse({ ...base, source: { model: 'ZoteroItem' } });
    expect(parsed.kind).toBe('prisma');
  });

  it('accepts a prisma resource with no model (model required check moved to adapter load)', () => {
    // Phase A: "model required" validation moved from the schema to the Prisma adapter
    // at datasource load time. A modelless prisma-kind resource is valid JSON — the
    // adapter rejects it when the datasource is wired up.
    const result = ResourceJsonSchema.safeParse({ ...base, kind: 'prisma' });
    expect(result.success).toBe(true);
  });

  it('accepts a custom resource with no model', () => {
    const result = ResourceJsonSchema.safeParse({
      ...base,
      kind: 'custom',
      columns: { id: { idField: true, type: 'string' } },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a custom resource that still declares a model', () => {
    const result = ResourceJsonSchema.safeParse({
      ...base,
      kind: 'custom',
      source: { model: 'ZoteroItem' },
      columns: { id: { idField: true, type: 'string' } },
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('source.model');
  });

  it('allows a datasource on a custom resource — it selects ctx.prisma', () => {
    const result = ResourceJsonSchema.safeParse({
      ...base,
      kind: 'custom',
      source: { datasource: 'maindb' },
      columns: { id: { idField: true, type: 'string' } },
    });
    expect(result.success).toBe(true);
  });

  it('rejects removed source.table / source.database with a pointer to the replacement', () => {
    for (const legacy of [{ table: 'books' }, { database: 'maindb' }]) {
      const key = Object.keys(legacy)[0];
      const result = ResourceJsonSchema.safeParse({
        ...base,
        source: { model: 'Book', ...legacy },
      });
      expect(result.success, `expected source.${key} to fail`).toBe(false);
      expect(issuePaths(result)).toContain(`source.${key}`);
      expect(JSON.stringify(result.error?.issues)).toContain(
        key === 'table' ? 'source.dbTable' : 'source.datasource',
      );
    }
  });

  it('requires a type on every column of a custom resource', () => {
    const result = ResourceJsonSchema.safeParse({
      ...base,
      kind: 'custom',
      columns: {
        id: { idField: true, type: 'string' },
        title: { searchable: true },
      },
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('columns.title.type');
  });

  it('exempts relation columns from the type requirement', () => {
    const result = ResourceJsonSchema.safeParse({
      ...base,
      kind: 'custom',
      columns: {
        id: { idField: true, type: 'string' },
        author: {
          fieldInput: {
            format: 'relation',
            relationType: 'manyToOne',
            resource: '../author/resource.json',
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('does not require column types on a prisma resource', () => {
    const result = ResourceJsonSchema.safeParse({
      ...base,
      source: { model: 'ZoteroItem' },
      columns: { id: { idField: true }, title: { searchable: true } },
    });
    expect(result.success).toBe(true);
  });

  it('rejects calculatedColumns on a custom resource', () => {
    const result = ResourceJsonSchema.safeParse({
      ...base,
      kind: 'custom',
      columns: { id: { idField: true, type: 'string' } },
      calculatedColumns: [
        {
          id: 'child_count',
          alias: 'child_count',
          label: 'Children',
          type: 'number',
          sqlExpression: 'SELECT 1',
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('calculatedColumns');
  });

  it('keeps an inline object column type through parsing', () => {
    const parsed = ResourceJsonSchema.parse({
      ...base,
      kind: 'custom',
      columns: {
        id: { idField: true, type: 'string' },
        type: {
          displayKey: 'name',
          type: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } },
          },
        },
      },
    });
    const column = parsed.columns?.find((c) => c.id === 'type');
    expect(column?.type).toEqual({
      type: 'object',
      properties: { id: { type: 'string' }, name: { type: 'string' } },
    });
  });

  it('honours idType', () => {
    const parsed = ResourceJsonSchema.parse({
      ...base,
      source: { model: 'ZoteroItem', idType: 'number' },
    });
    expect((parsed as any).source?.idType).toBe('number');
  });
});
