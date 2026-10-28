import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { columnTypeSchemaSource, fixNestedUiSchemaScopes, nestedColumnSchemaSource } from './column-type-schema.source';
import { zodSchemaSource } from '../schema';
import type { ViewConfig } from './schema';
import { buildLayouts } from '../layout';
import type { Layout } from '../layout';
import { JsonColumnSchema } from '../resource';
import { invalid } from '../utils/test-utils';

const propsOf = (view: ViewConfig | undefined): Record<string, Record<string, unknown>> =>
  (view?.json_schema?.['properties'] ?? {}) as Record<string, Record<string, unknown>>;

const parse = (arr: Record<string, unknown>[]) =>
  arr.map((c) => JsonColumnSchema.parse(c));

describe('buildViews — fieldInput.defaultValue', () => {
  const schema = z.object({
    id: z.string(),
    role: z.string(),
    bio: z.string().optional(),
  });

  const columns = parse([
    { id: 'id', idField: true, hiddenInForm: true },
    { id: 'role', fieldInput: { type: 'select', defaultValue: 'admin' } },
    { id: 'bio', fieldInput: { type: 'textarea' } },
  ]);

  const views = buildLayouts(undefined, { columns, source: zodSchemaSource(schema), warn: () => undefined });
  const formProps = propsOf(views.form);

  it('injects defaultValue as JSON Schema `default` on the form view', () => {
    expect(formProps.role?.['default']).toBe('admin');
  });

  it('does not add `default` when fieldInput has no defaultValue', () => {
    expect(formProps.bio?.['default']).toBeUndefined();
  });
});

describe('buildViews — no schema fallback to column types', () => {
  const columns = parse([
    { id: 'id', type: 'string', idField: true, hiddenInForm: true },
    { id: 'title', type: 'string' },
    { id: 'count', type: 'integer' },
    { id: 'register', fieldInput: { type: 'autocomplete' } },
  ]);

  const views = buildLayouts(invalid<Layout>({ table: { filterFields: ['title'] } }), { columns, source: columnTypeSchemaSource, warn: () => undefined });

  it('produces table, form, filter, and view', () => {
    expect(Object.keys(views).sort()).toEqual(['filter', 'form', 'table', 'view']);
  });

  it('derives table properties from column types', () => {
    const props = propsOf(views.table);
    expect(props.title?.['type']).toBe('string');
    expect(props.count?.['type']).toBe('integer');
  });

  it('includes typeless autocomplete column in the schema', () => {
    const props = propsOf(views.form);
    expect(props.register).toBeDefined();
    expect(props.register?.['type']).toBeUndefined();
  });

  it('matches direct buildLayouts call with columnTypeSchemaSource', () => {
    const expected = buildLayouts(invalid<Layout>({ table: { filterFields: ['title'] } }), { columns, source: columnTypeSchemaSource, warn: () => undefined });
    expect(views).toEqual(expected);
  });
});

describe('buildViews — hiddenInForm is absolute even when updateable', () => {
  const schema = z.object({
    id: z.string(),
    title: z.string(),
    modified: z.string().date(),
  });

  const columns = parse([
    { id: 'id', idField: true, hiddenInForm: true },
    { id: 'title' },
    { id: 'modified', type: 'date', hiddenInForm: true, updateable: true },
  ]);

  const views = buildLayouts(undefined, { columns, source: zodSchemaSource(schema), warn: () => undefined });

  it('excludes hiddenInForm column from form schema even when updateable', () => {
    expect(propsOf(views.form).modified).toBeUndefined();
  });

  it('still includes non-hidden columns', () => {
    expect(propsOf(views.form).title).toBeDefined();
  });
});

describe('buildViewsFromColumns — fieldInput.defaultValue (sub-resource path)', () => {
  const columns = parse([
    { id: 'role', column: 'role', fieldInput: { type: 'select', defaultValue: 'admin' } },
    { id: 'bio', column: 'bio', fieldInput: { type: 'textarea' } },
  ]);

  it('injects defaultValue on the flat (non-nested) property', () => {
    const raw = buildLayouts(undefined, { columns, source: nestedColumnSchemaSource, warn: () => undefined });
    const views = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, { ...v, ui_schema: fixNestedUiSchemaScopes(v.ui_schema as Record<string, unknown>, columns) }])
    );
    const formProps = propsOf(views['form'] as ViewConfig | undefined);
    expect(formProps.role?.['default']).toBe('admin');
    expect(formProps.bio?.['default']).toBeUndefined();
  });
});
