import { describe, expect, it } from 'vitest';

import { JsonColumnSchema } from '@ghentcdh/crouton-core';

import { buildFormUiSchema } from './form-schema.builder';

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
