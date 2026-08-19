import { describe, expect, it } from 'vitest';

import { buildViewsFromColumns } from './view.builder';
import type { JsonColumn } from '../resource/Column';

/**
 * `buildViewsFromColumns` is the no-Zod path used for sub-resources. It predates
 * the column-level `type` introduced for `kind: "custom"` resources and read only
 * the deprecated `columnType`, so every column fell to the `string` default —
 * `applySchemaTransforms` then added `minLength: 1` and a numeric field rendered
 * as a required text input:
 *
 *   { "type": "number", "fieldInput": { "type": "number" } }
 *     → { type: "string", title: "Amount", minLength: 1 }
 *
 * The renderer testers key off the resolved schema type (`schemaTypeIs('number')`,
 * `schemaFormatIsOneOf('date', …)`), so getting the type right is what selects the
 * right control — there is nothing to fix in the ui schema.
 */

const col = (overrides: Partial<JsonColumn> & { id: string }): JsonColumn =>
  overrides as JsonColumn;

const formProps = (columns: JsonColumn[]) => {
  const views = buildViewsFromColumns(columns);
  return (views?.['form']?.json_schema as any)?.properties;
};

describe('buildViewsFromColumns honours a declared column type', () => {
  it('keeps a number a number', () => {
    const props = formProps([
      col({ id: 'id', idField: true }),
      col({
        id: 'amount',
        label: 'Amount',
        type: 'number',
        fieldInput: { type: 'number' } as any,
      }),
    ]);
    expect(props.amount.type).toBe('number');
  });

  it('does not slip minLength onto a number', () => {
    const props = formProps([
      col({ id: 'amount', label: 'Amount', type: 'number' }),
    ]);
    expect(props.amount.minLength).toBeUndefined();
  });

  it('carries the label through as the title', () => {
    const props = formProps([
      col({ id: 'amount', label: 'Amount', type: 'number' }),
    ]);
    expect(props.amount.title).toBe('Amount');
  });

  it('maps integer, boolean and date shorthands', () => {
    const props = formProps([
      col({ id: 'year', type: 'integer' }),
      col({ id: 'paid', type: 'boolean' }),
      col({ id: 'spentOn', type: 'date' }),
      col({ id: 'seenAt', type: 'date-time' }),
    ]);
    expect(props.year.type).toBe('integer');
    expect(props.paid.type).toBe('boolean');
    expect(props.spentOn).toMatchObject({ type: 'string', format: 'date' });
    expect(props.seenAt).toMatchObject({ type: 'string', format: 'date-time' });
  });

  it('expands a JSON Schema fragment', () => {
    const props = formProps([
      col({
        id: 'member',
        type: {
          type: 'object',
          properties: { id: { type: 'string' }, share: { type: 'number' } },
        } as any,
      }),
    ]);
    expect(props.member.type).toBe('object');
    expect(props.member.properties.share.type).toBe('number');
  });

  it('still defaults to string when no type is declared', () => {
    const props = formProps([col({ id: 'label' })]);
    expect(props.label.type).toBe('string');
  });

  it('still honours the deprecated columnType', () => {
    const props = formProps([
      col({ id: 'amount', columnType: 'number' } as any),
    ]);
    expect(props.amount.type).toBe('number');
  });

  it('leaves an autocomplete column typeless', () => {
    const props = formProps([
      col({ id: 'paidBy', fieldInput: { type: 'autocomplete' } as any }),
    ]);
    expect(props.paidBy.type).toBeUndefined();
  });
});
