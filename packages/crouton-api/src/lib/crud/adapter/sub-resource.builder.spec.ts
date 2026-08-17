import { describe, expect, it, vi } from 'vitest';

import type { JsonColumn } from '@ghentcdh/crouton-core';

const RESOLVED = {
  json: {
    route: 'child',
    columns: [],
    operations: {},
  },
  dir: '/mock/child',
};

vi.mock('./resource-resolver', () => ({
  resolveChildResource: () => RESOLVED,
  resolveChildResourceDetailed: () => ({ ok: true, value: RESOLVED }),
}));

// Import after mock setup
import { buildSubResources } from './sub-resource.builder';

const col = (overrides: Partial<JsonColumn> & { id: string }): JsonColumn =>
  ({
    id: overrides.id,
    hiddenInForm: overrides.hiddenInForm,
    hiddenInView: overrides.hiddenInView,
    fieldInput: {
      format: 'relation',
      resource: './child.resource',
      ...overrides.fieldInput,
    },
  }) as JsonColumn;

describe('buildSubResources', () => {
  const parentRoute = '/parent';
  const parentModel = 'parent';
  const parentDir = '/mock/parent';

  it('visible relation → includeInFindOne: true', () => {
    const columns = [col({ id: 'author', hiddenInForm: false })];
    const result = buildSubResources(columns, parentRoute, parentModel, parentDir);
    expect(result[0].includeInFindOne).toBe(true);
  });

  it('hidden in both form and view → no includeInFindOne', () => {
    const columns = [col({ id: 'author', hiddenInForm: true, hiddenInView: true })];
    const result = buildSubResources(columns, parentRoute, parentModel, parentDir);
    expect(result[0].includeInFindOne).toBeUndefined();
  });

  it('fieldInput.options.sort → findOneOrderBy computed', () => {
    const columns = [
      col({
        id: 'items',
        hiddenInForm: false,
        fieldInput: {
          format: 'relation',
          resource: './child.resource',
          options: { sort: 'title' },
        },
      }),
    ];
    const result = buildSubResources(columns, parentRoute, parentModel, parentDir);
    expect(result[0].findOneOrderBy).toEqual({ title: 'asc' });
  });

  it('dotted sort → nested findOneOrderBy', () => {
    const columns = [
      col({
        id: 'items',
        hiddenInForm: false,
        fieldInput: {
          format: 'relation',
          resource: './child.resource',
          options: { sort: 'author.name' },
        },
      }),
    ];
    const result = buildSubResources(columns, parentRoute, parentModel, parentDir);
    expect(result[0].findOneOrderBy).toEqual({ author: { name: 'asc' } });
  });

  it('fieldInput.options.sortDir → respected in findOneOrderBy', () => {
    const columns = [
      col({
        id: 'items',
        hiddenInForm: false,
        fieldInput: {
          format: 'relation',
          resource: './child.resource',
          options: { sort: 'title', sortDir: 'desc' },
        },
      }),
    ];
    const result = buildSubResources(columns, parentRoute, parentModel, parentDir);
    expect(result[0].findOneOrderBy).toEqual({ title: 'desc' });
  });

  it('fieldInput.relation → overrides relation name', () => {
    const columns = [
      col({
        id: 'sectionText',
        fieldInput: {
          format: 'relation',
          resource: './child.resource',
          relation: 'section_text',
        },
      }),
    ];
    const result = buildSubResources(columns, parentRoute, parentModel, parentDir);
    expect(result[0].relation).toBe('section_text');
  });

  it('fallback chain: fieldInput.relation > c.id', () => {
    // No fieldInput.relation → falls back to c.id
    const columns = [
      col({
        id: 'author',
        fieldInput: {
          format: 'relation',
          resource: './child.resource',
        },
      }),
    ];
    const result = buildSubResources(columns, parentRoute, parentModel, parentDir);
    expect(result[0].relation).toBe('author');
  });

  it('no sort → no findOneOrderBy on visible relation', () => {
    const columns = [col({ id: 'tags', hiddenInForm: false })];
    const result = buildSubResources(columns, parentRoute, parentModel, parentDir);
    expect(result[0].includeInFindOne).toBe(true);
    expect(result[0].findOneOrderBy).toBeUndefined();
  });
});
