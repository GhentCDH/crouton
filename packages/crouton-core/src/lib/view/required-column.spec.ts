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

/**
 * An autocomplete column has no declared `type` on purpose: the shape of its
 * `{ value, label }` envelope depends on the widget's `storeValue` option. But a
 * typeless property becomes `unknown` once the form converts the schema to Zod,
 * and `unknown` accepts `undefined` and `null` — so listing it in `required`
 * validated nothing. The control showed its required marker and an empty field
 * still submitted.
 */
describe('required on a typeless (autocomplete) column', () => {
  const autocomplete = (required?: boolean) =>
    col({
      id: 'paid_by',
      label: 'Paid by',
      displayKey: 'name',
      ...(required !== undefined && { required }),
      fieldInput: {
        type: 'autocomplete',
        options: { uri: '/users?q={q}', valueKey: 'id', labelKey: 'name' },
      },
    } as any);

  it('lists it in required', () => {
    const views = buildViewsFromColumnTypes([
      col({ id: 'id', type: 'string', idField: true }),
      autocomplete(true),
    ]);
    expect(required(views)).toEqual(['paid_by']);
  });

  it('constrains the type so the requirement can actually reject a value', () => {
    const views = buildViewsFromColumnTypes([
      col({ id: 'id', type: 'string', idField: true }),
      autocomplete(true),
    ]);
    const prop = (views?.['form']?.json_schema as any).properties.paid_by;
    expect(prop.type).toEqual([
      'object',
      'array',
      'string',
      'number',
      'boolean',
    ]);
    expect(prop.type).not.toContain('null');
  });

  it('leaves an optional autocomplete typeless', () => {
    const views = buildViewsFromColumnTypes([
      col({ id: 'id', type: 'string', idField: true }),
      autocomplete(),
    ]);
    const prop = (views?.['form']?.json_schema as any).properties.paid_by;
    expect(prop.type).toBeUndefined();
  });

  it('does not touch a column that declares its own type', () => {
    const views = buildViewsFromColumnTypes([
      col({ id: 'id', type: 'string', idField: true }),
      col({
        id: 'member',
        required: true,
        type: { type: 'object', properties: { id: { type: 'string' } } },
      } as any),
    ]);
    const prop = (views?.['form']?.json_schema as any).properties.member;
    expect(prop.type).toBe('object');
  });

  it('does not touch an enum-constrained column', () => {
    const views = buildViewsFromColumnTypes([
      col({ id: 'id', type: 'string', idField: true }),
      col({
        id: 'status',
        required: true,
        fieldInput: { options: { values: ['open', 'closed'] } },
      } as any),
    ]);
    const prop = (views?.['form']?.json_schema as any).properties.status;
    expect(prop.enum).toEqual(['open', 'closed']);
    expect(Array.isArray(prop.type)).toBe(false);
  });
});
