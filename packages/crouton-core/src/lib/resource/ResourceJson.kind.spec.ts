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
    const parsed = ResourceJsonSchema.parse({ ...base, model: 'ZoteroItem' });
    expect(parsed.kind).toBe('prisma');
  });

  it('requires model on a prisma resource', () => {
    const result = ResourceJsonSchema.safeParse({ ...base, kind: 'prisma' });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('model');
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
      model: 'ZoteroItem',
      columns: { id: { idField: true, type: 'string' } },
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain('model');
  });

  it('allows database on a custom resource — it selects ctx.prisma', () => {
    const result = ResourceJsonSchema.safeParse({
      ...base,
      kind: 'custom',
      database: 'maindb',
      columns: { id: { idField: true, type: 'string' } },
    });
    expect(result.success).toBe(true);
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
      model: 'ZoteroItem',
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
      model: 'ZoteroItem',
      idType: 'number',
    });
    expect(parsed.idType).toBe('number');
  });
});
