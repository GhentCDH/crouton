import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { columnTypeSchemaSource, fixNestedUiSchemaScopes, nestedColumnSchemaSource } from './column-type-schema.source';
import { zodSchemaSource } from '../schema/view/build-view';
import { buildLayouts } from '../layout';
import type { JsonColumn } from '../resource/Column';
import { invalid } from '../utils/test-utils';
import { ViewConfig } from '../schema';

const propsOf = (views: Record<string, ViewConfig>, view = 'form'): Record<string, Record<string, unknown>> =>
  (views?.[view]?.json_schema?.['properties'] ?? {}) as Record<string, Record<string, unknown>>;

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
  invalid<JsonColumn>({
    hiddenInForm: false,
    hiddenInTable: false,
    hiddenInView: false,
    createable: true,
    updateable: true,
    idField: false,
    ...overrides,
  });

const required = (views: Record<string, ViewConfig> | undefined, view = 'form'): string[] | undefined =>
  views?.[view]?.json_schema?.['required'] as string[] | undefined;

describe('required on a custom resource (no Zod model)', () => {
  const columns = [
    col({ id: 'id', type: 'string', idField: true }),
    col({ id: 'label', type: 'string', required: true }),
    col({ id: 'amount', type: 'number', required: true }),
    col({ id: 'note', type: 'string' }),
  ];

  const bl = (cols: JsonColumn[]) => buildLayouts(undefined, { columns: cols, source: columnTypeSchemaSource, warn: () => undefined });

  it('marks the flagged columns required', () => {
    expect(required(bl(columns))).toEqual(['label', 'amount']);
  });

  it('leaves unflagged columns alone', () => {
    expect(required(bl(columns))).not.toContain('note');
  });

  it('does not require the id column even when flagged', () => {
    const views = bl([
      col({ id: 'id', type: 'string', idField: true, required: true }),
      col({ id: 'label', type: 'string' }),
    ]);
    expect(required(views)).toBeUndefined();
  });

  it('does not require a field the form cannot write', () => {
    const views = bl([
      col({ id: 'computed', type: 'string', required: true, createable: false, updateable: false }),
      col({ id: 'label', type: 'string' }),
    ]);
    expect(required(views)).toBeUndefined();
  });

  it('keeps required off the filter view', () => {
    const views = bl([col({ id: 'label', type: 'string', required: true })]);
    expect(required(views, 'filter')).toBeUndefined();
  });

  it('keeps required off the table and view schemas', () => {
    const views = bl(columns);
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

  const bz = (cols: JsonColumn[]) => buildLayouts(undefined, { columns: cols, source: zodSchemaSource(schema), warn: () => undefined });

  it('adds a column the model left optional', () => {
    const views = bz([col({ id: 'id', idField: true }), col({ id: 'label' }), col({ id: 'note', required: true })]);
    expect(required(views)).toContain('note');
  });

  it('removes a column the model made mandatory', () => {
    const views = bz([col({ id: 'id', idField: true }), col({ id: 'label', required: false }), col({ id: 'note' })]);
    expect(required(views) ?? []).not.toContain('label');
  });

  it('leaves the model alone when the flag is absent', () => {
    const views = bz([col({ id: 'id', idField: true }), col({ id: 'label' }), col({ id: 'note' })]);
    expect(required(views)).toEqual(['label']);
  });
});

describe('required on a sub-resource (schema-less column path)', () => {
  const bn = (cols: JsonColumn[]) => {
    const raw = buildLayouts(undefined, { columns: cols, source: nestedColumnSchemaSource, warn: () => undefined });
    return Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, { ...v, ui_schema: fixNestedUiSchemaScopes(v.ui_schema as Record<string, unknown>, cols) }])
    );
  };

  it('applies to the child form', () => {
    const views = bn([
      col({ id: 'id', idField: true }),
      col({ id: 'label', type: 'string', required: true }),
      col({ id: 'amount', type: 'number' }),
    ]);
    expect(required(views)).toEqual(['label']);
  });

  it('emits no required array when nothing is flagged', () => {
    const views = bn([col({ id: 'id', idField: true }), col({ id: 'label', type: 'string' })]);
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
  const autocomplete = (required?: boolean): JsonColumn =>
    invalid<JsonColumn>({
      id: 'paid_by',
      label: 'Paid by',
      displayKey: 'name',
      ...(required !== undefined && { required }),
      fieldInput: invalid<JsonColumn['fieldInput']>({
        type: 'autocomplete',
        options: { uri: '/users?q={q}', valueKey: 'id', labelKey: 'name' },
      }),
    });

  const blc = (cols: JsonColumn[]) => buildLayouts(undefined, { columns: cols, source: columnTypeSchemaSource, warn: () => undefined });

  it('lists it in required', () => {
    const views = blc([col({ id: 'id', type: 'string', idField: true }), autocomplete(true)]);
    expect(required(views)).toEqual(['paid_by']);
  });

  it('constrains the type so the requirement can actually reject a value', () => {
    const views = blc([col({ id: 'id', type: 'string', idField: true }), autocomplete(true)]);
    const prop = propsOf(views).paid_by;
    expect(prop?.['type']).toEqual(['object', 'array', 'string', 'number', 'boolean']);
    expect(prop?.['type'] as unknown[]).not.toContain('null');
  });

  it('leaves an optional autocomplete typeless', () => {
    const views = blc([col({ id: 'id', type: 'string', idField: true }), autocomplete()]);
    const prop = propsOf(views).paid_by;
    expect(prop?.['type']).toBeUndefined();
  });

  it('does not touch a column that declares its own type', () => {
    const views = blc([
      col({ id: 'id', type: 'string', idField: true }),
      col({ id: 'member', required: true, type: invalid<JsonColumn['type']>({ type: 'object', properties: { id: { type: 'string' } } }) }),
    ]);
    const prop = propsOf(views).member;
    expect(prop?.['type']).toBe('object');
  });

  it('does not touch an enum-constrained column', () => {
    const views = blc([
      col({ id: 'id', type: 'string', idField: true }),
      col({ id: 'status', required: true, fieldInput: invalid<JsonColumn['fieldInput']>({ options: { values: ['open', 'closed'] } }) }),
    ]);
    const prop = propsOf(views).status;
    expect(prop?.['enum']).toEqual(['open', 'closed']);
    expect(Array.isArray(prop?.['type'])).toBe(false);
  });
});
