import { describe, expect, it } from 'vitest';

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

  it('keeps an explicit search list as is', () => {
    expect(buildSearch(columns, ['stock', 'name'], true)).toEqual(['stock', 'name']);
  });
});
