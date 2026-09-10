import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildViews } from './view.builder';
import { JsonColumnSchema } from '../resource/Column';

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

  const views = buildViews(schema, columns);
  const formProps = (views?.form?.json_schema as any).properties;

  it('injects defaultValue as JSON Schema `default` on the form view', () => {
    expect(formProps.role.default).toBe('admin');
  });

  it('does not add `default` when fieldInput has no defaultValue', () => {
    expect(formProps.bio.default).toBeUndefined();
  });
});

describe('buildViews — no schema fallback to column types', () => {
  const columns = parse([
    { id: 'id', type: 'string', idField: true, hiddenInForm: true },
    { id: 'title', type: 'string', filterable: true },
    { id: 'count', type: 'integer' },
    { id: 'register', fieldInput: { type: 'autocomplete' } },
  ]);

  const views = buildViews(undefined, columns);

  it('produces table, form, filter, and view', () => {
    expect(Object.keys(views ?? {}).sort()).toEqual(['filter', 'form', 'table', 'view']);
  });

  it('derives table properties from column types', () => {
    const props = (views?.table?.json_schema as any).properties;
    expect(props.title.type).toBe('string');
    expect(props.count.type).toBe('integer');
  });

  it('includes typeless autocomplete column in the schema', () => {
    const props = (views?.form?.json_schema as any).properties;
    expect(props.register).toBeDefined();
    expect(props.register.type).toBeUndefined();
  });

  it('matches buildViewsFromColumnTypes output', async () => {
    const { buildViewsFromColumnTypes } = await import('./view.builder');
    const expected = buildViewsFromColumnTypes(columns);
    expect(views).toEqual(expected);
  });
});

describe('buildViewsFromColumns — fieldInput.defaultValue (sub-resource path)', () => {
  const columns = parse([
    { id: 'role', column: 'role', fieldInput: { type: 'select', defaultValue: 'admin' } },
    { id: 'bio', column: 'bio', fieldInput: { type: 'textarea' } },
  ]);

  it('injects defaultValue on the flat (non-nested) property', async () => {
    const { buildViewsFromColumns } = await import('./view.builder');
    const views = buildViewsFromColumns(columns);
    const formProps = (views?.form?.json_schema as any).properties;
    expect(formProps.role.default).toBe('admin');
    expect(formProps.bio.default).toBeUndefined();
  });
});
