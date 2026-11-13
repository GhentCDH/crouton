import { describe, expect, it } from 'vitest';

import { ResourceJsonSchema } from '../ResourceJson.schema';
import { LAYOUT_CODEMODS, runCodemods } from './codemods';

const run = (raw: Record<string, unknown>) => runCodemods(raw).raw;

describe('resource codemods', () => {
  it('moves root source fields under source', () => {
    expect(run({ name: 'books', model: 'Book', table: 'books', database: 'maindb', idType: 'number' })).toEqual({
      name: 'books',
      source: { model: 'Book', dbTable: 'books', datasource: 'maindb', idType: 'number' },
    });
    expect(run({ name: 'b', source: { model: 'B', table: 't', database: 'd' } })).toEqual({
      name: 'b',
      source: { dbTable: 't', datasource: 'd', model: 'B' },
    });
  });

  it('removes root id and keeps the route when it differed', () => {
    expect(run({ name: 'books', id: 'books' })).toEqual({ name: 'books' });
    expect(run({ name: 'books', id: 'library' })).toEqual({ name: 'books', route: 'library' });
  });

  it('moves tag to openapi.tag unless openapi is set', () => {
    expect(run({ name: 'b', tag: 'Books' })).toEqual({ name: 'b', openapi: { tag: 'Books' } });
    expect(run({ name: 'b', tag: 'Books', openapi: { tag: 'X' } })).toEqual({ name: 'b', tag: 'Books', openapi: { tag: 'X' } });
  });

  it('moves display/modalSize into the form and view containers', () => {
    expect(run({ name: 'b', display: 'modal', modalSize: 'lg' })).toEqual({
      name: 'b',
      layout: { form: { container: { mode: 'modal', size: 'lg' } }, view: { container: { mode: 'modal', size: 'lg' } } },
    });
  });

  it('copies root include to findAll and findOne', () => {
    const include = ['author', { relation: 'chapters', orderBy: { position: 'asc' } }];
    expect(run({ name: 'b', include })).toEqual({
      name: 'b',
      operations: { findAll: { include }, findOne: { include } },
    });
  });

  it('turns calculatedColumns into computed columns', () => {
    expect(
      run({
        name: 'b',
        columns: { title: {} },
        calculatedColumns: [{ id: 'n', alias: 'n', label: 'N', type: 'number', sqlExpression: 'SELECT 1' }],
      }),
    ).toEqual({
      name: 'b',
      columns: { title: {}, n: { label: 'N', computed: { sql: 'SELECT 1', type: 'number' } } },
    });
  });

  it('collects showInLookup into lookup.labels', () => {
    expect(
      run({ name: 'p', columns: { firstName: { showInLookup: true }, lastName: { showInLookup: true }, age: { showInLookup: false } } }),
    ).toEqual({
      name: 'p',
      columns: { firstName: {}, lastName: {}, age: {} },
      lookup: { labels: ['firstName', 'lastName'], separator: ' ' },
    });
  });

  it('lifts relation config out of fieldInput', () => {
    expect(
      run({
        name: 'l',
        columns: {
          authorId: {
            fieldInput: {
              format: 'relation',
              resource: 'authors',
              relationType: 'manyToOne',
              foreignKey: 'author_id',
              relation: 'author',
              options: { sort: 'lastName', sortDir: 'asc', displayKey: 'fullName' },
            },
          },
        },
      }),
    ).toEqual({
      name: 'l',
      columns: {
        authorId: {
          relation: { resource: 'authors', type: 'manyToOne', foreignKey: 'author_id', prismaField: 'author', sort: 'lastName', sortDir: 'asc' },
          displayKey: 'fullName',
        },
      },
    });
  });

  it('fixes spellings, format → type, detail.controls and dead fields', () => {
    expect(
      run({
        name: 'x',
        columns: {
          isbn: { createable: false, updateable: false },
          pages: { fieldInput: { type: 'Integer' } },
          period: { fieldInput: { format: 'date-range' } },
          loans: { fieldInput: { detail: { layout: 'row', controls: [{ property: 'amount' }] } } },
          body: { type: 'text', fieldView: { type: 'markdown' }, columnType: 'longtext' },
        },
      }),
    ).toEqual({
      name: 'x',
      columns: {
        isbn: { creatable: false, updatable: false },
        pages: { fieldInput: { type: 'integer' } },
        period: { fieldInput: { type: 'dateRange' } },
        loans: { fieldInput: { detail: { layout: 'row', items: [{ property: 'amount' }] } } },
        body: { type: 'text' },
      },
    });
  });

  it('moves table search/filter settings and column flags to operations.findAll', () => {
    expect(
      run({
        name: 'b',
        columns: { title: { searchable: true }, body: {}, status: { filterable: true } },
        layout: { table: { controls: ['title', 'status'], actions: [{ id: 'approve' }], searchFields: ['body'], filterFields: ['status'] } },
      }),
    ).toEqual({
      name: 'b',
      columns: { title: {}, body: {}, status: {} },
      layout: { table: { items: ['title', 'status'], rowActions: [{ id: 'approve' }] } },
      operations: { findAll: { search: ['body', 'title'], filter: ['status'] } },
    });
  });

  it('mirrors the loader for legacy table flags: materialises layout.table, appends unlisted columns only', () => {
    expect(run({ name: 'b', columns: { t: { searchable: true } } })).toEqual({
      name: 'b',
      columns: { t: {} },
      layout: { table: {} },
      operations: { findAll: { search: ['t'] } },
    });
    expect(
      run({
        name: 'b',
        columns: { a: { sortable: true }, b: { sortable: true, defaultSort: true } },
        layout: { table: { items: ['a'] } },
      }),
    ).toEqual({
      name: 'b',
      columns: { a: {}, b: {} },
      layout: { table: { items: ['a', { id: 'b', sortable: true, defaultSort: true }] } },
    });
  });

  it('leaves a disabled findAll alone', () => {
    expect(run({ name: 'b', operations: { findAll: false }, columns: { t: { searchable: true } } })).toMatchObject({
      operations: { findAll: false },
      columns: { t: {} },
    });
  });

  describe('column presentation → layout items', () => {
    it('deletes positions that follow source order', () => {
      expect(run({ name: 'b', columns: { a: { position: 0 }, b: { fieldInput: { position: 1 } } } })).toEqual({
        name: 'b',
        columns: { a: {}, b: {} },
      });
    });

    it('matches the guide example (reorder + props, table unchanged)', () => {
      expect(
        run({
          name: 'b',
          columns: {
            title: { fieldInput: { position: 1, options: { colspan: 6 } } },
            author: { hiddenInTable: true, fieldInput: { position: 0 } },
            notes: { hideLabel: true },
          },
        }),
      ).toEqual({
        name: 'b',
        columns: { title: {}, author: { hiddenInTable: true }, notes: {} },
        layout: {
          form: { items: ['author', { id: 'title', colspan: 6 }, { id: 'notes', hideLabel: true }] },
          view: { items: ['author', { id: 'title', colspan: 6 }, { id: 'notes', hideLabel: true }] },
        },
      });
    });

    it('adds table defaults when a reorder creates the table layout', () => {
      const out = run({ name: 'b', columns: { a: { position: 1 }, b: { position: 0 } } });
      expect((out['layout'] as Record<string, unknown>)['table']).toEqual({
        items: ['b', 'a'],
        rowClick: 'none',
        pageSizes: [10, 20, 50, 100],
      });
    });

    it('patches existing layouts: strings become objects, object items keep their own values', () => {
      expect(
        run({
          name: 'b',
          columns: {
            a: { fieldInput: { options: { colspan: 6, readonly: true, label: 'x' } } },
            b: { hideLabel: true, position: 5 },
          },
          layout: { form: { items: ['a', { type: 'collapse', items: [{ id: 'b', hideLabel: false, colspan: 4 }] }] } },
        }),
      ).toMatchObject({
        columns: { a: {}, b: {} },
        layout: {
          form: { items: [{ id: 'a', colspan: 6, readonly: true }, { type: 'collapse', items: [{ id: 'b', hideLabel: false, colspan: 4 }] }] },
        },
      });
    });

    it('moves fieldTable onto table items', () => {
      expect(
        run({
          name: 'b',
          columns: { title: {}, status: { fieldTable: { type: 'select', options: { values: [] } } } },
          layout: { table: { items: ['title'] } },
        }),
      ).toEqual({
        name: 'b',
        columns: { title: {}, status: {} },
        layout: { table: { items: ['title', { id: 'status', type: 'select', options: { values: [] } }] } },
      });
    });
  });

  const legacy = {
    name: 'books',
    id: 'books',
    model: 'Book',
    tag: 'Books',
    display: 'modal',
    modalSize: 'lg',
    include: ['author'],
    calculatedColumns: [{ id: 'chapter_count', label: 'Chapters', type: 'number', position: 0, sqlExpression: 'SELECT 1' }],
    columns: {
      id: {},
      title: { searchable: true, sortable: true, showInLookup: true, fieldInput: { position: 2, options: { colspan: 6 } } },
      status: { filterable: true, createable: false, fieldInput: { type: 'Integer' } },
      author: { fieldInput: { format: 'relation', resource: 'authors', relationType: 'manyToOne', options: { displayKey: 'name' } } },
    },
    layout: {
      table: { type: 'grid', actions: [{ id: 'approve', label: 'Approve', procedure: 'approve' }], items: [{ type: 'table', controls: ['title', 'status'] }] },
    },
  };

  it('produces a file that validates without errors', () => {
    const result = ResourceJsonSchema.safeParse(run(legacy));
    expect(result.success ? [] : result.error.issues).toEqual([]);
  });

  it('is idempotent', () => {
    const once = runCodemods(legacy);
    expect(once.applied.length).toBeGreaterThan(5);
    const twice = runCodemods(once.raw);
    expect(twice.raw).toEqual(once.raw);
    expect(twice.applied).toEqual([]);
  });

  it('layout chain only touches layout nodes', () => {
    const out = runCodemods(legacy, LAYOUT_CODEMODS).raw;
    expect(out['model']).toBe('Book');
    expect(out['layout']).toEqual({
      table: { type: 'grid', items: [{ type: 'table', items: ['title', 'status'], rowActions: [{ id: 'approve', label: 'Approve', procedure: 'approve' }] }] },
    });
  });
});
