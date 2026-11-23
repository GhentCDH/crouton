import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { JsonColumn } from '../resource';
import { buildSearch } from './search-lookup';

describe('buildSearch default fallback (#594)', () => {
  const columns = [
    { id: 'id', idField: true, fieldInput: { type: 'number' } },
    { id: 'name', fieldInput: { type: 'string' } },
    { id: 'notes', fieldInput: { type: 'textarea' } },
    { id: 'stock', fieldInput: { type: 'number' } },
    { id: 'active', fieldInput: { type: 'boolean' } },
    { id: 'status', fieldInput: { type: 'select' } },
    { id: 'createdAt', fieldInput: { type: 'date' } },
    { id: 'code', type: 'string' },
    { id: 'count', type: 'integer' },
    { id: 'day', type: 'date' },
    { id: 'untyped' },
  ] as JsonColumn[];

  it('only searches text columns', () => {
    expect(buildSearch(columns, undefined, true)).toEqual(['name', 'notes', 'code']);
  });

  it('returns undefined when no text column exists', () => {
    expect(buildSearch(columns.filter((c) => c.id === 'stock'), undefined, true)).toBeUndefined();
  });

  it('treats an explicit empty search list as disabled', () => {
    expect(buildSearch(columns, [], true)).toBeUndefined();
  });

  it('types untyped columns from the Prisma schema', () => {
    const schema = z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string().nullable(),
      email: z.string().email(),
      stock: z.number().int(),
      status: z.enum(['a', 'b']),
      createdAt: z.date(),
    });
    const untyped = ['id', 'name', 'slug', 'email', 'stock', 'status', 'createdAt', 'missing']
      .map((id) => ({ id, ...(id === 'id' && { idField: true }) })) as JsonColumn[];
    expect(buildSearch(untyped, undefined, true, schema)).toEqual(['name', 'slug', 'email']);
  });

  it('keeps an explicit search list as is', () => {
    expect(buildSearch(columns, ['stock', 'name'], true)).toEqual(['stock', 'name']);
  });
});
