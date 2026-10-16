import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { JsonColumnSchema, buildLayouts, resolveColumnFieldVariants, zodSchemaSource } from '@ghentcdh/crouton-core';

const schema = z.object({ id: z.string(), name: z.string() });

const parse = (arr: Record<string, unknown>[]) =>
  arr.map((c) => JsonColumnSchema.parse(c));

const fieldInputFor = (view: any, id: string) =>
  (view.columns as Array<{ id: string; fieldInput?: any }>).find(
    (c) => c.id === id,
  )?.fieldInput;

describe('buildViews with field variants', () => {
  it('renders form and view from fieldInput, table from layout.table.controls options', () => {
    const cols = resolveColumnFieldVariants(
      parse([
        { id: 'id', idField: true, hiddenInForm: true },
        {
          id: 'name',
          fieldInput: { type: 'text', options: { display: 'input' } },
        },
      ]),
    )!;

    const layout = {
      table: { items: [{ id: 'name', options: { display: 'chip' } }] },
    };
    const views = buildLayouts(layout as any, { columns: cols, source: zodSchemaSource(schema) });

    expect(
      (fieldInputFor(views.form, 'name').options as Record<string, unknown>)
        .display,
    ).toBe('input');
    expect(
      (fieldInputFor(views.view, 'name').options as Record<string, unknown>)
        .display,
    ).toBe('input');
    // Table override comes from layout.table.items — visible in the UI schema element
    const tableEl = (views.table.ui_schema as any)?.elements?.find(
      (e: any) => e.scope === '#/properties/name',
    );
    expect((tableEl?.options as Record<string, unknown>)?.display).toBe('chip');
  });

  it('table view respects column order from layout.table.items', () => {
    // Column order is now declared in layout.table.items (array order = display order).
    const schema2 = z.object({ name: z.string(), code: z.string() });
    const cols2 = resolveColumnFieldVariants(
      parse([
        { id: 'code' },
        { id: 'name' },
      ]),
    )!;

    const layout = { table: { items: ['name', 'code'] } };
    const views = buildLayouts(layout as any, { columns: cols2, source: zodSchemaSource(schema2) });
    const tableColIds = views.table.columns.map((c: any) => c.id);
    expect(tableColIds).toEqual(['name', 'code']);
  });

  it('regression: no variants → table/form/view expose identical fieldInput', () => {
    const cols = resolveColumnFieldVariants(
      parse([
        { id: 'id', idField: true, hiddenInForm: true },
        { id: 'name', fieldInput: { type: 'text', options: { display: 'x' } } },
      ]),
    )!;

    const views = buildLayouts(undefined, { columns: cols, source: zodSchemaSource(schema) });

    expect(fieldInputFor(views.table, 'name')).toEqual(
      fieldInputFor(views.form, 'name'),
    );
    expect(fieldInputFor(views.view, 'name')).toEqual(
      fieldInputFor(views.form, 'name'),
    );
  });
});
