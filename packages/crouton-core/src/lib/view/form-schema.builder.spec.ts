import { describe, expect, it } from 'vitest';

import { buildFormControl, buildFormUiSchema } from './form-schema.builder';
import { JsonColumnSchema } from '../resource/Column';


const parse = (arr: Record<string, unknown>[]) =>
  arr.map((c) => JsonColumnSchema.parse(c));

const byScope = (uiSchema: any, id: string) =>
  uiSchema.elements.find((e: any) => e.scope === `#/properties/${id}`);

describe('buildFormUiSchema (golden output)', () => {
  const cols = parse([
    { id: 'name', label: 'Name', fieldInput: { type: 'text' } },
    { id: 'bio', fieldInput: { type: 'textarea' } },
    {
      id: 'author',
      fieldInput: { format: 'relation', relationType: 'manyToOne', resource: 'author' },
    },
    { id: 'status', fieldInput: { type: 'text' }, showWhen: { field: 'active', eq: true } },
    { id: 'reason', fieldInput: { type: 'text' }, disabledWhen: { field: 'locked', eq: true } },
  ]);

  const uiSchema = buildFormUiSchema(cols) as any;

  it('is a GridLayout with one Control per column', () => {
    expect(uiSchema.type).toBe('GridLayout');
    expect(uiSchema.elements).toHaveLength(5);
    for (const el of uiSchema.elements) expect(el.type).toBe('Control');
  });

  it('carries label and default colspan on a plain field', () => {
    const name = byScope(uiSchema, 'name');
    expect(name.options.label).toBe('Name');
    expect(name.options.colspan).toBe(12);
    expect(name.options.format).toBe('text');
  });

  it('forces colspan 12 on a relation field', () => {
    const author = byScope(uiSchema, 'author');
    expect(author.options.format).toBe('relation');
    expect(author.options.colspan).toBe(12);
  });

  it('emits SHOW / DISABLE rules directly on the control (no post-build mutation)', () => {
    expect(byScope(uiSchema, 'status').rule).toEqual({
      effect: 'SHOW',
      condition: { scope: '#/properties/active', schema: { const: true } },
    });
    expect(byScope(uiSchema, 'reason').rule).toEqual({
      effect: 'DISABLE',
      condition: { scope: '#/properties/locked', schema: { const: true } },
    });
  });

  it('does not emit a rule for fields without conditions', () => {
    expect(byScope(uiSchema, 'name').rule).toBeUndefined();
  });
});

describe('buildFormControl option forwarding', () => {
  it('forwards date options (withTime, min, max, locale) into uischema', () => {
    const col = JsonColumnSchema.parse({
      id: 'start',
      fieldInput: { type: 'date', options: { withTime: true, min: '2020-01-01', locale: 'nl-BE' } },
    });
    const built = buildFormControl(col).build() as any;
    expect(built.options.format).toBe('date');
    expect(built.options.withTime).toBe(true);
    expect(built.options.min).toBe('2020-01-01');
    expect(built.options.locale).toBe('nl-BE');
  });

  it('forwards autocomplete options including storeValue into uischema', () => {
    const col = JsonColumnSchema.parse({
      id: 'author',
      fieldInput: { type: 'autocomplete', options: { resource: './author.resource.json', storeValue: true, labelKey: 'name' } },
    });
    const built = buildFormControl(col).build() as any;
    expect(built.options.format).toBe('autocomplete');
    // ponytail: unit test only; full round-trip (write→read→assert scalar) needs an API integration test
    expect(built.options.storeValue).toBe(true);
    expect(built.options.labelKey).toBe('name');
  });

  it('forwards select options into uischema via generic else branch', () => {
    const col = JsonColumnSchema.parse({
      id: 'status',
      fieldInput: { type: 'select', options: { options: [{ label: 'Active', value: 'active' }] } },
    });
    const built = buildFormControl(col).build() as any;
    expect(built.options.format).toBe('select');
    expect(built.options.options).toEqual([{ label: 'Active', value: 'active' }]);
  });

  it('forwards date-range options into uischema', () => {
    const col = JsonColumnSchema.parse({
      id: 'period',
      fieldInput: { format: 'date-range', options: { fromLabel: 'Start', toLabel: 'End' } },
    });
    const built = buildFormControl(col).build() as any;
    expect(built.options.format).toBe('date-range');
    expect(built.options.fromLabel).toBe('Start');
    expect(built.options.toLabel).toBe('End');
  });
});
