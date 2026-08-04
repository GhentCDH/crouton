import { JsonColumnSchema } from '@ghentcdh/crouton-core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { resolveColumnFieldVariants } from '../adapter/column-transforms';
import { buildViews } from './view.builder';

const schema = z.object({ id: z.string(), name: z.string() });

const parse = (arr: Record<string, unknown>[]) =>
  arr.map((c) => JsonColumnSchema.parse(c));

const fieldInputFor = (view: any, id: string) =>
  (view.columns as Array<{ id: string; fieldInput?: any }>).find(
    (c) => c.id === id,
  )?.fieldInput;

describe('buildViews with field variants', () => {
  it('renders form from fieldInput, view from fieldView, table from fieldTable', () => {
    const cols = resolveColumnFieldVariants(
      parse([
        { id: 'id', idField: true, hiddenInForm: true },
        {
          id: 'name',
          fieldInput: { type: 'text', options: { display: 'input' } },
          fieldView: { options: { display: 'link' } },
          fieldTable: { options: { display: 'chip' } },
        },
      ]),
    )!;

    const views = buildViews(schema, cols)!;

    expect(
      (fieldInputFor(views.form, 'name').options as Record<string, unknown>)
        .display,
    ).toBe('input');
    expect(
      (fieldInputFor(views.view, 'name').options as Record<string, unknown>)
        .display,
    ).toBe('link');
    expect(
      (fieldInputFor(views.table, 'name').options as Record<string, unknown>)
        .display,
    ).toBe('chip');
  });

  it('regression: no variants → table/form/view expose identical fieldInput', () => {
    const cols = resolveColumnFieldVariants(
      parse([
        { id: 'id', idField: true, hiddenInForm: true },
        { id: 'name', fieldInput: { type: 'text', options: { display: 'x' } } },
      ]),
    )!;

    const views = buildViews(schema, cols)!;

    expect(fieldInputFor(views.table, 'name')).toEqual(
      fieldInputFor(views.form, 'name'),
    );
    expect(fieldInputFor(views.view, 'name')).toEqual(
      fieldInputFor(views.form, 'name'),
    );
  });
});
