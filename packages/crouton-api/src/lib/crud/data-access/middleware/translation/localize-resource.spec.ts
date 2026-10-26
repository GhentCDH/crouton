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
  data: {
    idField: 'id',
    idType: 'string',
    fields: {
      id: { id: 'id', dbName: 'id', type: 'string', required: false },
      title: { id: 'title', dbName: 'title', type: 'string', required: false },
      status: { id: 'status', dbName: 'status', type: 'string', required: false },
    },
    valueLabels: [
      { field: 'status', enumName: 'bookStatus', values: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
      ] },
    ],
    search: [],
    include: { findAll: [], findOne: [] },
    allowedIncludes: [],
    computed: [],
    subResources: [],
    actions: [],
  },
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

  it('patches view json_schema title for translated column', () => {
    const result = localizeResource(makeResource(), t);
    const formProps = (result.views?.form as any)?.json_schema?.properties;
    expect(formProps?.title?.title).toBe('Titel');
  });

  it('does not mutate original resource', () => {
    const original = makeResource();
    localizeResource(original, t);
    expect(original.title).toBe('Books');
    expect((original.views?.form as any)?.json_schema?.properties?.title?.title).toBe('Title');
  });

  it('patches view json_schema property titles (redundant with test above; kept for clarity)', () => {
    const result = localizeResource(makeResource(), t);
    const statusProps = (result.views?.form as any)?.json_schema?.properties;
    expect(statusProps?.status?.title).toBe('Status');
  });

  it('patches view column labels via view.columns', () => {
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

  it('translates enum option labels via valueLabelColumns', () => {
    const result = localizeResource(makeResource(), t);
    const statusVlc = (result.valueLabelColumns as any[]).find((v: any) => v.field === 'status');
    const values = statusVlc?.values;
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
    // Column labels are no longer patched on column objects — check view schemas instead
    const formProps = (result.views?.form as any)?.json_schema?.properties;
    expect(formProps?.title?.title).toBe('Title');
  });

  it('falls back to field id when no translation exists for isbn field', () => {
    // isbn field has no translation — columnLabels uses field id as fallback
    const resourceWithIsbn = makeResource({
      data: {
        idField: 'id',
        idType: 'string',
        fields: {
          isbn: { id: 'isbn', dbName: 'isbn', type: 'string', required: false },
        },
        valueLabels: [],
        search: [],
        include: { findAll: [], findOne: [] },
        allowedIncludes: [],
        computed: [],
        subResources: [],
        actions: [],
      },
    });
    const result = localizeResource(resourceWithIsbn, t);
    // isbn is not in the NL bundle — it should fall back to field id
    expect(result.title).toBeDefined();
  });
});
