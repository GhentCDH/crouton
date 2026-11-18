import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { JsonColumn } from '@ghentcdh/crouton-core';

import { invalid } from '../../../../testing/index';
import { buildFilterWhere, filterFieldTypes } from './filter';

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

describe('buildFilterWhere — value coercion by field type (#557)', () => {
  const types = { own: 'boolean', year: 'integer', price: 'number', title: 'string' };

  it('turns "true"/"false" into booleans for boolean fields', () => {
    expect(buildFilterWhere(['own:true:equals'], types)).toEqual({ AND: [{ own: { equals: true } }] });
    expect(buildFilterWhere(['own:false:not_equals'], types)).toEqual({ AND: [{ own: { not: false } }] });
  });

  it('defaults to equals when the operator is omitted', () => {
    expect(buildFilterWhere(['own:true'], types)).toEqual({ AND: [{ own: { equals: true } }] });
  });

  it('turns numeric equals / in values into numbers', () => {
    expect(buildFilterWhere(['year:1999:equals'], types)).toEqual({ AND: [{ year: { equals: 1999 } }] });
    expect(buildFilterWhere(['price:["1.5","2"]:in'], types)).toEqual({ AND: [{ price: { in: [1.5, 2] } }] });
  });

  it('rejects a value that does not match the type with 400, not a Prisma 500', () => {
    expect(() => buildFilterWhere(['own:yes:equals'], types)).toThrow(BadRequestException);
    expect(() => buildFilterWhere(['year:abc:equals'], types)).toThrow(BadRequestException);
  });

  it('leaves string and unknown fields untouched', () => {
    expect(buildFilterWhere(['title:123:equals'], types)).toEqual({ AND: [{ title: { equals: '123' } }] });
    expect(buildFilterWhere(['other:true:equals'], types)).toEqual({ AND: [{ other: { equals: 'true' } }] });
  });
});

describe('filterFieldTypes', () => {
  const schema = z.object({ own: z.boolean().nullable(), year: z.number().int(), title: z.string() });

  it('reads primitive types from the findAll schema', () => {
    expect(filterFieldTypes({ findAll: { schema } })).toMatchObject({ own: 'boolean', year: 'integer', title: 'string' });
  });

  it('lets an explicit column type win', () => {
    const types = filterFieldTypes({ findAll: { schema } }, [invalid<JsonColumn>({ id: 'title', type: 'boolean' })]);
    expect(types['title']).toBe('boolean');
  });
});
