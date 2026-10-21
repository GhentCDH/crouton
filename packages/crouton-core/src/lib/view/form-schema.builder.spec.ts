import { describe, expect, it } from 'vitest';

import { buildFormControl, buildFormUiSchema } from './form-schema.builder';
import { buildFormUiSchemaFromLayout } from '../layout/layout-ui-schema.builder';
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
    { id: 'status', fieldInput: { type: 'text' } },
    { id: 'reason', fieldInput: { type: 'text' } },
  ]);

  // Conditions now live on layout controls, not column-level flags.
  const layoutNode = {
    items: [
      'name',
      'bio',
      'author',
      { id: 'status', showWhen: { field: 'active', eq: true } },
      { id: 'reason', disabledWhen: { field: 'locked', eq: true } },
    ],
  };

  const uiSchema = buildFormUiSchemaFromLayout(layoutNode as any, cols) as any;

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

  it('emits SHOW rule for showWhen', () => {
    expect(byScope(uiSchema, 'status').rule).toEqual({
      effect: 'SHOW',
      condition: { scope: '#/properties/active', schema: { const: true } },
    });
  });

  it('emits disabledWhen into options (not rule) so showWhen and disabledWhen can coexist', () => {
    const reason = byScope(uiSchema, 'reason');
    expect(reason.rule).toBeUndefined();
    expect(reason.options.disabledWhen).toEqual({ field: 'locked', eq: true });
  });

  it('does not emit a rule for fields without conditions', () => {
    expect(byScope(uiSchema, 'name').rule).toBeUndefined();
  });

  it('disabled + showWhen coexist: both in options and rule', () => {
    const cols2 = parse([{ id: 'title', fieldInput: { type: 'text' } }]);
    const schema2 = buildFormUiSchemaFromLayout(
      { items: [{ id: 'title', disabled: true, showWhen: { field: 'active', eq: true } }] } as any,
      cols2,
    ) as any;
    const title = schema2.elements[0];
    expect(title.options.disabled).toBe(true);
    expect(title.rule).toMatchObject({ effect: 'SHOW' });
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

  it('forwards disabled from column fieldInput.options into uischema', () => {
    const col = JsonColumnSchema.parse({
      id: 'slug',
      fieldInput: { type: 'text', options: { disabled: true } },
    });
    const built = buildFormControl(col).build() as any;
    expect(built.options.disabled).toBe(true);
  });

  it('forwards disabledWhen from column fieldInput.options into uischema', () => {
    const col = JsonColumnSchema.parse({
      id: 'status',
      fieldInput: { type: 'text', options: { disabledWhen: { field: 'id', exists: true } } },
    });
    const built = buildFormControl(col).build() as any;
    expect(built.options.disabledWhen).toEqual({ field: 'id', exists: true });
  });
});
