import { describe, expect, it } from 'vitest';

import { buildFilterWhere } from './filter';

describe('buildFilterWhere — in / not_in', () => {
  it('produces Prisma in condition', () => {
    const result = buildFilterWhere(['id:["1","2"]:in']);
    expect(result).toEqual({ AND: [{ id: { in: ['1', '2'] } }] });
  });

  it('produces Prisma notIn condition', () => {
    const result = buildFilterWhere(['id:[1,2]:not_in']);
    expect(result).toEqual({ AND: [{ id: { notIn: [1, 2] } }] });
  });

  it('skips condition for empty list', () => {
    expect(buildFilterWhere(['id:[]:not_in'])).toBeUndefined();
  });

  it('skips condition for invalid JSON', () => {
    expect(buildFilterWhere(['id:bad:not_in'])).toBeUndefined();
  });

  it('handles dotted paths', () => {
    const result = buildFilterWhere(['author.id:[1,2]:not_in']);
    expect(result).toEqual({ AND: [{ author: { id: { notIn: [1, 2] } } }] });
  });
});
