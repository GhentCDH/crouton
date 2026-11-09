import { describe, expect, it } from 'vitest';

import { enrichIncludeWithSort } from '../compile/column-enrichment';
import { JsonColumnSchema } from './Column';
import { buildResourceJsonSchema } from './ResourceJson.schema';


const ResourceJsonSchema = buildResourceJsonSchema();

const parseResource = (overrides: Record<string, unknown>) =>
  ResourceJsonSchema.safeParse({
    name: 'book',
    source: { model: 'Book' },
    columns: {
      title: { type: 'string' },
      author: { relation: { type: 'manyToOne', resource: '../author/resource.json' } },
      sections: { relation: { type: 'oneToMany', resource: '../section/resource.json' } },
    },
    ...overrides,
  });

describe('include dot paths — schema validation', () => {
  it('plain string include is valid', () => {
    const result = parseResource({ operations: { findAll: { include: ['author'] } } });
    expect(result.success).toBe(true);
  });

  it('dot-path string include is valid', () => {
    const result = parseResource({ operations: { findAll: { include: ['author.books'] } } });
    expect(result.success).toBe(true);
  });

  it('object-form include is valid', () => {
    const result = parseResource({
      operations: { findAll: { include: [{ relation: 'sections', orderBy: { position: 'asc' } }] } },
    });
    expect(result.success).toBe(true);
  });

  it('mixed dot-path + object for same relation is valid', () => {
    const result = parseResource({
      operations: {
        findAll: { include: ['author.books', { relation: 'author', orderBy: { name: 'asc' } }] },
      },
    });
    expect(result.success).toBe(true);
  });

  it('root include key → error with migration hint', () => {
    const result = parseResource({ include: ['author'] });
    expect(result.success).toBe(false);
    const msg = JSON.stringify(result.error?.issues);
    expect(msg).toContain('operations.findAll.include');
    expect(msg).toContain('operations.findOne.include');
  });

  it('3-level deep dot path is valid', () => {
    const result = parseResource({
      operations: { findAll: { include: ['author.books.chapters'] } },
    });
    expect(result.success).toBe(true);
  });

  it('nested include inside object form with valid top relation is valid', () => {
    const result = parseResource({
      operations: {
        findOne: { include: [{ relation: 'sections', include: ['author'] }] },
      },
    });
    expect(result.success).toBe(true);
  });
});

const relationCol = (id: string, sort?: string, sortDir?: string) =>
  JsonColumnSchema.parse({
    id,
    relation: {
      type: 'oneToMany',
      resource: `./${id}/resource.json`,
      ...(sort && { sort }),
      ...(sortDir && { sortDir }),
    },
  });

describe('enrichIncludeWithSort — dot-path strings', () => {
  const columns = [
    JsonColumnSchema.parse({ id: 'title', type: 'string' }),
    relationCol('sections', 'position', 'asc'),
    relationCol('author'),
  ];

  it('plain string matching a sorted relation gets orderBy', () => {
    const result = enrichIncludeWithSort([{ relation: 'sections' }], columns);
    expect(result?.[0]).toMatchObject({ relation: 'sections', orderBy: { position: 'asc' } });
  });

  it('dot-path string: top segment matched for sort → split into object with nested include + orderBy', () => {
    // "sections.author" → top segment "sections" has sort → { relation: "sections", include: ["author"], orderBy: ... }
    const result = enrichIncludeWithSort(['sections.author'], columns);
    expect(result?.[0]).toMatchObject({
      relation: 'sections',
      include: ['author'],
      orderBy: { position: 'asc' },
    });
  });

  it('dot-path where top segment has no sort → entry returned unchanged', () => {
    const result = enrichIncludeWithSort(['author.books'], columns);
    expect(result?.[0]).toBe('author.books');
  });

  it('non-relation string passes through unchanged', () => {
    const result = enrichIncludeWithSort(['title'], columns);
    expect(result?.[0]).toBe('title');
  });
});
