import { describe, expect, it } from 'vitest';

import { ResourceJsonSchema } from './ResourceJson.schema';

const parse = (columns: Record<string, unknown>) => {
  const result = ResourceJsonSchema.safeParse({ name: 'item', source: { model: 'Item' }, columns });
  if (!result.success) throw result.error;
  return Object.fromEntries((result.data.columns ?? []).map((c) => [c.id, c]));
};

describe('legacy spelling aliases', () => {
  it('rewrites createable/updateable to creatable/updatable', () => {
    const cols = parse({ a: { createable: false, updateable: false } });
    expect(cols['a']).toMatchObject({ creatable: false, updatable: false });
  });

  it('keeps the new spelling when both are present', () => {
    const cols = parse({ a: { createable: false, creatable: true } });
    expect(cols['a']?.creatable).toBe(true);
  });

  it.each([
    ['Integer', 'integer'],
    ['mutliSelect', 'multiSelect'],
    ['date-range', 'dateRange'],
  ])('rewrites fieldInput type/format %s → %s', (old, next) => {
    const cols = parse({ a: { fieldInput: { type: old } }, b: { fieldInput: { format: old } } });
    expect(cols['a']?.fieldInput?.type).toBe(next);
    expect(cols['b']?.fieldInput?.format).toBe(next);
  });
});
