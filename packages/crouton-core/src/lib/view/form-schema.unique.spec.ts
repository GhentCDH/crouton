import { describe, expect, it } from 'vitest';

import { buildFormUiSchema } from '../schema/column/form-control';
import { JsonColumnSchema } from '../resource/Column';
import { type TestControl, asControl, asLayout } from '../utils/test-utils';

const parse = (arr: Record<string, unknown>[]) =>
  arr.map((c) => JsonColumnSchema.parse(c));

const byScope = (uiSchema: unknown, id: string): TestControl | undefined =>
  asLayout(uiSchema).elements
    .map((e) => asControl(e))
    .find((e) => e?.scope === `#/properties/${id}`);

describe('buildFormUiSchema — unique option', () => {
  it('injects a normalized `unique` descriptor into control options', () => {
    const ui = buildFormUiSchema(
      parse([
        { id: 'email', fieldInput: { type: 'text' }, unique: true },
        { id: 'name', fieldInput: { type: 'text' } },
      ]),
    );
    expect(byScope(ui, 'email')?.options?.['unique']).toEqual({ enabled: true });
    expect(byScope(ui, 'name')?.options?.['unique']).toBeUndefined();
  });

  it('passes a custom message through', () => {
    const ui = buildFormUiSchema(
      parse([
        {
          id: 'email',
          fieldInput: { type: 'text' },
          unique: { message: 'Email already registered' },
        },
      ]),
    );
    expect(byScope(ui, 'email')?.options?.['unique']).toEqual({
      enabled: true,
      message: 'Email already registered',
    });
  });
});
