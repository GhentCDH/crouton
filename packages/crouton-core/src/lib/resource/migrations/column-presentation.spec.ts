
import { describe, expect, it } from 'vitest';

import { compileResource } from '../../compile/compile-resource';
import { ResourceJsonSchema } from '../ResourceJson.schema';
import { migrateColumnPresentation } from './column-presentation';
import type { RawResourceJson } from './types';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const base = (extra: RawResourceJson): RawResourceJson => ({
  name: 'thing',
  route: 'thing',
  ...extra,
});

/** An object layout item defaults `rowspan: 1`, which equals the renderer default. */
const stripDefaultRowspan = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(stripDefaultRowspan);
  if (typeof v !== 'object' || v === null) return v;
  return Object.fromEntries(
    Object.entries(v)
      .filter(([k, x]) => !(k === 'rowspan' && x === 1))
      .map(([k, x]) => [k, stripDefaultRowspan(x)]),
  );
};

/**
 * What renders: each view's `ui` + `data`, and the column ids/labels. The view's
 * `columns` echo the raw column definitions, which the codemod changes on purpose.
 */
const views = (raw: RawResourceJson) =>
  Object.fromEntries(
    Object.entries(
      compileResource(ResourceJsonSchema.parse(raw)).views ?? {},
    ).map(([kind, view]) => {
      const { columns, ...rest } = view as {
        columns?: { id: string; label?: string }[];
      };
      const cols = columns?.map(({ id, label }) => ({ id, label }));
      // Form/view render from `ui`; only the table header follows `columns` order.
      if (kind !== 'table') cols?.sort((a, b) => a.id.localeCompare(b.id));
      return [kind, { ...(stripDefaultRowspan(rest) as object), columns: cols }] as const;
    }),
  );

const hasTableLayout = (raw: RawResourceJson) =>
  (raw['layout'] as RawResourceJson | undefined)?.['table'] !== undefined;

/**
 * A generated `layout.table` emits table-node options the no-layout table leaves to
 * the frontend. They must equal the frontend fallbacks; then drop them from the compare.
 */
const FRONTEND_TABLE_DEFAULTS = {
  rowClick: 'none',
  pageSizes: [10, 20, 50, 100],
  pageSize: 20,
  density: 'normal',
};
const dropTableNodeOptions = (v: Record<string, unknown>) => {
  const table = v['table'] as { ui?: Record<string, unknown> } | undefined;
  if (!table?.ui) return v;
  const { options, ...ui } = table.ui;
  expect(options).toEqual(FRONTEND_TABLE_DEFAULTS);
  return { ...v, table: { ...table, ui } };
};

const expectSameRender = (raw: RawResourceJson) => {
  const migrated = migrateColumnPresentation(raw);
  const generatedTable = !hasTableLayout(raw) && hasTableLayout(migrated);
  const after = generatedTable
    ? dropTableNodeOptions(views(migrated))
    : views(migrated);
  expect(after).toEqual(views(raw));
  return migrated;
};

describe('migrateColumnPresentation', () => {
  it('leaves a file without presentation keys untouched (same reference)', () => {
    const raw = base({ columns: { id: { idField: true }, title: {} } });
    expect(migrateColumnPresentation(raw)).toBe(raw);
  });

  it('strips codegen positions that follow source order without adding a layout', () => {
    const raw = base({
      columns: {
        id: { idField: true, hiddenInForm: true },
        title: { fieldInput: { type: 'text', position: 0 } },
        year: { fieldInput: { type: 'number', position: 1 } },
      },
    });
    const migrated = expectSameRender(raw);
    expect(migrated['layout']).toBeUndefined();
    expect(migrated['columns']).toEqual({
      id: { idField: true, hiddenInForm: true },
      title: { fieldInput: { type: 'text' } },
      year: { fieldInput: { type: 'number' } },
    });
  });

  it('writes the rendered order as a layout when positions reorder columns', () => {
    const raw = base({
      columns: {
        id: {
          idField: true,
          hiddenInForm: true,
          hiddenInTable: true,
          hiddenInView: true,
        },
        title: { fieldInput: { position: 5 } },
        author: { hiddenInTable: true, fieldInput: { position: 1 } },
      },
    });
    const migrated = expectSameRender(raw);
    expect(migrated['layout']).toEqual({
      form: { items: ['author', 'title'] },
      view: { items: ['author', 'title'] },
    });
  });

  it('moves option props onto generated form/view items', () => {
    const raw = base({
      columns: {
        title: { fieldInput: { options: { colspan: 6, placeholder: 'x' } } },
        notes: { hideLabel: true },
      },
    });
    const migrated = expectSameRender(raw);
    expect(migrated['columns']).toEqual({
      title: { fieldInput: { options: { placeholder: 'x' } } },
      notes: {},
    });
    expect(migrated['layout']).toEqual({
      form: {
        items: [
          { id: 'title', colspan: 6 },
          { id: 'notes', hideLabel: true },
        ],
      },
      view: {
        items: [
          { id: 'title', colspan: 6 },
          { id: 'notes', hideLabel: true },
        ],
      },
    });
  });

  it('copies props onto existing layout items without overriding them', () => {
    const raw = base({
      columns: {
        title: { fieldInput: { options: { colspan: 6, readonly: true } } },
        notes: { hideLabel: true, fieldInput: { options: { colspan: 4 } } },
      },
      layout: {
        form: { items: ['title', { id: 'notes', hideLabel: false }] },
      },
    });
    const migrated = expectSameRender(raw);
    expect((migrated['layout'] as RawResourceJson)['form']).toEqual({
      // string item: column values become item values
      // object item: colspan was already defaulted to 12 by the item → column 4 dropped
      items: [
        { id: 'title', colspan: 6, readonly: true },
        { id: 'notes', hideLabel: false },
      ],
    });
  });

  it('drops fieldInput.options.label (the column label always won over it)', () => {
    const raw = base({
      columns: {
        a: { fieldInput: { options: { label: 'ignored' } } },
        b: { label: 'Bee', fieldInput: { options: { label: 'ignored' } } },
      },
    });
    const migrated = expectSameRender(raw);
    expect(migrated['columns']).toEqual({
      a: { fieldInput: {} },
      b: { label: 'Bee', fieldInput: {} },
    });
  });

  it('keeps computed columns in their rendered slot', () => {
    const raw = base({
      columns: {
        title: {},
        year: {},
        count: { computed: { sql: 'select 1' }, fieldInput: { position: 0 } },
      },
    });
    const migrated = expectSameRender(raw);
    expect((migrated['columns'] as RawResourceJson)['count']).toEqual({
      computed: { sql: 'select 1' },
      fieldInput: {},
    });
    expect((migrated['layout'] as RawResourceJson)['table']).toEqual({
      items: ['count', 'title', 'year'],
      rowClick: 'none',
      pageSizes: [10, 20, 50, 100],
    });
  });
});

describe('migrateColumnPresentation on repo resources renders the same', () => {
  const roots = [
    resolve(
      __dirname,
      '../../../../../../examples/book-collection/apps/backend/src/app/resources',
    ),
  ];
  const files = roots.flatMap((root) =>
    readdirSync(root, { recursive: true, encoding: 'utf-8' })
      .filter((f) => f.endsWith('resource.json'))
      .map((f) => join(root, f)),
  );

  it('found resources to check', () => expect(files.length).toBeGreaterThan(3));

  for (const file of files) {
    it(file.split('/').slice(-2).join('/'), () => {
      expectSameRender(
        JSON.parse(readFileSync(file, 'utf-8')) as RawResourceJson,
      );
    });
  }
});
