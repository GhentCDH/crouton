import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import type { JsonColumn } from '@ghentcdh/crouton-core';

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

describe('buildSubResources — child layout forwarded to views', () => {
  const parentRoute = '/parent';
  const parentModel = 'parent';
  const parentDir = '/mock/parent';

  const savedJson = RESOLVED.json;

  beforeEach(() => {
    (RESOLVED as any).json = {
      route: 'child',
      operations: {},
      columns: [
        { id: 'title', hiddenInForm: false, hiddenInTable: false },
        { id: 'notes', hiddenInForm: false, hiddenInTable: false },
      ],
    };
  });

  afterEach(() => {
    (RESOLVED as any).json = savedJson;
  });

  it('no layout → both columns appear in auto-generated form', () => {
    const columns = [col({ id: 'content', hiddenInForm: false })];
    const result = buildSubResources(columns, parentRoute, parentModel, parentDir);
    const scopes = formScopes(result[0].views);
    expect(scopes).toContain('#/properties/title');
    expect(scopes).toContain('#/properties/notes');
  });

  it('layout.form.items restricts which columns appear in the form', () => {
    (RESOLVED as any).json.layout = {
      form: { type: 'grid', items: ['title'] },
    };
    const columns = [col({ id: 'content', hiddenInForm: false })];
    const result = buildSubResources(columns, parentRoute, parentModel, parentDir);
    const scopes = formScopes(result[0].views);
    expect(scopes).toContain('#/properties/title');
    expect(scopes).not.toContain('#/properties/notes');
  });

  it('layout.form.container → modalSize and display forwarded', () => {
    (RESOLVED as any).json.layout = {
      form: { container: { mode: 'modal', size: 'xl' }, type: 'grid', items: ['title'] },
    };
    const columns = [col({ id: 'content', hiddenInForm: false })];
    const result = buildSubResources(columns, parentRoute, parentModel, parentDir);
    expect(result[0].modalSize).toBe('xl');
    // `customComponent` is part of the compiled display shape; it is always
    // present (null when the child has no custom view component), matching
    // `compile-resource.ts`.
    expect(result[0].display).toEqual({ mode: 'modal', customComponent: null });
  });
});

const formScopes = (views: Record<string, any> | undefined): string[] => {
  const elements = views?.form?.ui_schema?.elements as any[] | undefined;
  return elements?.map((e: any) => e.scope) ?? [];
};
