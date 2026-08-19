import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  buildViews,
  buildViewsFromColumnTypes,
  buildViewsFromColumns,
} from './view.builder';
import type { JsonColumn } from '../resource/Column';

/**
 * `required` on a column.
 *
 * A prisma resource gets its `required` array from the Zod model, so the flag is
 * an override in both directions. A `kind: "custom"` resource has no model —
 * `columnTypeSchemaSource` emits properties and nothing else — so before this the
 * form had no way to demand a value at all.
 *
 * Form-only by design: a required filter field would make the filter panel
 * unsubmittable, and the table and view schemas are read-only.
 */

const col = (overrides: Partial<JsonColumn> & { id: string }): JsonColumn =>
  ({
    hiddenInForm: false,
    hiddenInTable: false,
    hiddenInView: false,
    createable: true,
    updateable: true,
    idField: false,
    ...overrides,
  }) as JsonColumn;

const required = (views: Record<string, any> | undefined, view = 'form') =>
  views?.[view]?.json_schema?.required;

describe('required on a custom resource (no Zod model)', () => {
  const columns = [
    col({ id: 'id', type: 'string', idField: true }),
    col({ id: 'label', type: 'string', required: true }),
    col({ id: 'amount', type: 'number', required: true }),
    col({ id: 'note', type: 'string' }),
  ];

  it('marks the flagged columns required', () => {
    expect(required(buildViewsFromColumnTypes(columns))).toEqual([
      'label',
      'amount',
    ]);
  });

  it('leaves unflagged columns alone', () => {
    expect(required(buildViewsFromColumnTypes(columns))).not.toContain('note');
  });

  it('does not require the id column even when flagged', () => {
    const views = buildViewsFromColumnTypes([
      col({ id: 'id', type: 'string', idField: true, required: true }),
      col({ id: 'label', type: 'string' }),
    ]);
    expect(required(views)).toBeUndefined();
  });

  it('does not require a field the form cannot write', () => {
    const views = buildViewsFromColumnTypes([
      col({
        id: 'computed',
        type: 'string',
        required: true,
        createable: false,
        updateable: false,
      }),
      col({ id: 'label', type: 'string' }),
    ]);
    expect(required(views)).toBeUndefined();
  });

  it('keeps required off the filter view', () => {
    const views = buildViewsFromColumnTypes([
      col({ id: 'label', type: 'string', required: true, filterable: true }),
    ]);
    expect(required(views, 'filter')).toBeUndefined();
  });

  it('keeps required off the table and view schemas', () => {
    const views = buildViewsFromColumnTypes(columns);
    expect(required(views, 'table')).toBeUndefined();
    expect(required(views, 'view')).toBeUndefined();
  });
});

describe('required overrides the Zod model on a prisma resource', () => {
  const schema = z.object({
    id: z.string(),
    label: z.string(),
    note: z.string().optional(),
  });

  it('adds a column the model left optional', () => {
    const views = buildViews(schema, [
      col({ id: 'id', idField: true }),
      col({ id: 'label' }),
      col({ id: 'note', required: true }),
    ]);
    expect(required(views)).toContain('note');
  });

  it('removes a column the model made mandatory', () => {
    const views = buildViews(schema, [
      col({ id: 'id', idField: true }),
      col({ id: 'label', required: false }),
      col({ id: 'note' }),
    ]);
    expect(required(views) ?? []).not.toContain('label');
  });

  it('leaves the model alone when the flag is absent', () => {
    const views = buildViews(schema, [
      col({ id: 'id', idField: true }),
      col({ id: 'label' }),
      col({ id: 'note' }),
    ]);
    expect(required(views)).toEqual(['label']);
  });
});

describe('required on a sub-resource (schema-less column path)', () => {
  it('applies to the child form', () => {
    const views = buildViewsFromColumns([
      col({ id: 'id', idField: true }),
      col({ id: 'label', type: 'string', required: true }),
      col({ id: 'amount', type: 'number' }),
    ]);
    expect(required(views)).toEqual(['label']);
  });

  it('emits no required array when nothing is flagged', () => {
    const views = buildViewsFromColumns([
      col({ id: 'id', idField: true }),
      col({ id: 'label', type: 'string' }),
    ]);
    expect(required(views)).toBeUndefined();
  });
});
