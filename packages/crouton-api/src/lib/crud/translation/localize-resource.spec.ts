import { describe, expect, it } from 'vitest';

import { createTranslator } from '@ghentcdh/crouton-core';

import { localizeResource } from './localize-resource';

// Minimal Resource fixture — only the fields localizeResource touches
const makeResource = (overrides: Record<string, unknown> = {}): any => ({
  name: 'book',
  title: 'Books',
  tag: 'Book',
  route: 'books',
  sidebar: { label: 'Books' },
  columns: [
    { id: 'id', idField: true, label: 'ID' },
    { id: 'title', label: 'Title' },
    { id: 'status', label: 'Status', enum: 'bookStatus', fieldInput: { options: { values: [
      { value: 'draft', label: 'Draft' },
      { value: 'published', label: 'Published' },
    ] } } },
  ],
  views: {
    form: {
      json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Title' },
          status: { type: 'string', title: 'Status' },
        },
      },
      ui_schema: {
        type: 'VerticalLayout',
        elements: [
          { type: 'Control', scope: '#/properties/title', options: { label: 'Title' } },
          { type: 'Control', scope: '#/properties/status', options: { label: 'Status' } },
        ],
      },
      columns: [
        { id: 'title', label: 'Title' },
        { id: 'status', label: 'Status' },
      ],
    },
    table: {
      json_schema: { type: 'object', properties: {} },
      ui_schema: { type: 'Table', elements: [] },
      columns: [
        { id: 'title', label: 'Title' },
        { id: 'status', label: 'Status' },
      ],
    },
  },
  actions: [{ id: 'export', label: 'Export', type: 'link', href: '#' }],
  tableActions: [{ id: 'searchOpenLibrary', label: 'Search Open Library', type: 'link', href: '#' }],
  subResources: [],
  valueLabelColumns: [],
  operations: {},
  definition: null,
  ...overrides,
});

const nlBundle = {
  resources: {
    book: {
      title: 'Boeken',
      sidebar: 'Boeken',
      columns: { title: 'Titel', status: 'Status' },
      actions: {
        export: 'Exporteren',
        searchOpenLibrary: 'Zoek Open Library',
      },
    },
  },
  enums: {
    bookStatus: {
      draft: 'Concept',
      published: 'Gepubliceerd',
    },
  },
};

const enBundle = {
  resources: {
    book: {
      title: 'Books',
      sidebar: 'Books',
      columns: { title: 'Title', status: 'Status' },
    },
  },
};

const t = createTranslator({ nl: nlBundle, en: enBundle }, 'nl', 'en');

describe('localizeResource', () => {
  it('translates resource title', () => {
    const result = localizeResource(makeResource(), t);
    expect(result.title).toBe('Boeken');
  });

  it('translates sidebar label', () => {
    const result = localizeResource(makeResource(), t);
    expect(result.sidebar?.label).toBe('Boeken');
  });

  it('translates column labels', () => {
    const result = localizeResource(makeResource(), t);
    const cols = result.columns as any[];
    const titleCol = cols.find((c: any) => c.id === 'title');
    expect(titleCol?.label).toBe('Titel');
  });

  it('does not mutate original resource', () => {
    const original = makeResource();
    localizeResource(original, t);
    expect(original.title).toBe('Books');
    expect((original.columns as any[]).find((c: any) => c.id === 'title')?.label).toBe('Title');
  });

  it('patches view json_schema property titles', () => {
    const result = localizeResource(makeResource(), t);
    const formProps = (result.views?.form as any)?.json_schema?.properties;
    expect(formProps?.title?.title).toBe('Titel');
  });

  it('patches view column labels', () => {
    const result = localizeResource(makeResource(), t);
    const formCols = (result.views?.form as any)?.columns;
    const titleCol = formCols?.find((c: any) => c.id === 'title');
    expect(titleCol?.label).toBe('Titel');
  });

  it('patches ui_schema element option labels', () => {
    const result = localizeResource(makeResource(), t);
    const elements = (result.views?.form as any)?.ui_schema?.elements as any[];
    const titleEl = elements?.find((e: any) => e.scope?.includes('/title'));
    expect(titleEl?.options?.label).toBe('Titel');
  });

  it('translates enum option labels', () => {
    const result = localizeResource(makeResource(), t);
    const statusCol = (result.columns as any[]).find((c: any) => c.id === 'status');
    const values = statusCol?.fieldInput?.options?.values;
    expect(values?.find((v: any) => v.value === 'draft')?.label).toBe('Concept');
    expect(values?.find((v: any) => v.value === 'published')?.label).toBe('Gepubliceerd');
  });

  it('translates row action labels', () => {
    const result = localizeResource(makeResource(), t);
    const exportAction = (result.actions as any[]).find((a: any) => a.id === 'export');
    expect(exportAction?.label).toBe('Exporteren');
  });

  it('translates table action labels', () => {
    const result = localizeResource(makeResource(), t);
    const action = (result.tableActions as any[]).find((a: any) => a.id === 'searchOpenLibrary');
    expect(action?.label).toBe('Zoek Open Library');
  });

  it('falls back to original label for missing translation key', () => {
    const tEn = createTranslator({ en: enBundle }, 'en', 'en');
    const result = localizeResource(makeResource(), tEn);
    expect(result.title).toBe('Books');
    const titleCol = (result.columns as any[]).find((c: any) => c.id === 'title');
    expect(titleCol?.label).toBe('Title');
  });

  it('falls back to EN label when NL key is absent', () => {
    // nl bundle has no entry for isbn — should fall back to EN (or original label)
    const resourceWithIsbn = makeResource({
      columns: [
        { id: 'isbn', label: 'ISBN' },
      ],
    });
    const result = localizeResource(resourceWithIsbn, t);
    const isbnCol = (result.columns as any[]).find((c: any) => c.id === 'isbn');
    expect(isbnCol?.label).toBe('ISBN');
  });
});
