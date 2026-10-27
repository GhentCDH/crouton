/**
 * Phase 0 pair spec — item H.
 *
 * `buildChildSortClause` exists privately in BOTH:
 *   core: `compile/column-enrichment.ts` (comment says "inlined from crouton-api sql.helpers")
 *   api:  `data-access/query/sql.helpers.ts` (exported)
 *
 * The api version is used for sub-resource `orderBy`. The core version is used
 * in `enrichIncludeWithSort`. They should produce the same output for the same
 * inputs. Phase 1 will keep the api version in core and delete both copies.
 *
 * The core private copy is not directly importable, so we test it indirectly via
 * `enrichIncludeWithSort` (exported) and compare with the api export.
 */
import { describe, expect, it } from 'vitest';

import { buildSort, enrichIncludeWithSort } from '@ghentcdh/crouton-core';
import type { JsonColumn } from '@ghentcdh/crouton-core';

import { buildChildSortClause } from '../data-access/query/sql.helpers';

describe('H: sort helpers — core (buildSort) vs api (buildChildSortClause)', () => {
  describe('plain field — delegates to buildSort', () => {
    it('asc', () => {
      expect(buildChildSortClause('title', 'asc')).toEqual({ title: 'asc' });
      expect(buildSort('title', 'asc')).toEqual({ title: 'asc' });
    });

    it('desc', () => {
      expect(buildChildSortClause('name', 'desc')).toEqual({ name: 'desc' });
      expect(buildSort('name', 'desc')).toEqual({ name: 'desc' });
    });

    it('undefined dir defaults to asc', () => {
      expect(buildChildSortClause('title', undefined)).toEqual({ title: 'asc' });
      expect(buildSort('title', undefined)).toEqual({ title: 'asc' });
    });

    it('invalid dir — known difference: api normalises via SortDirEnum, core allows raw', () => {
      // api buildChildSortClause for plain name delegates to core buildSort
      // core buildSort: SortDirEnum.safeParse returns 'asc' as default for invalid
      expect(buildChildSortClause('title', 'INVALID')).toEqual({ title: 'asc' });
      expect(buildSort('title', 'INVALID')).toEqual({ title: 'asc' });
    });
  });

  describe('nested dotted path', () => {
    it('one level nesting', () => {
      const api = buildChildSortClause('author.name', 'asc');
      // core builds the same structure via enrichIncludeWithSort
      expect(api).toEqual({ author: { name: 'asc' } });
    });

    it('two level nesting', () => {
      const api = buildChildSortClause('author.origin.country', 'desc');
      expect(api).toEqual({ author: { origin: { country: 'desc' } } });
    });
  });

  describe('core enrichIncludeWithSort — exercises the private buildChildSortClause', () => {
    it('adds orderBy from column relation.sort when entry matches', () => {
      const columns: JsonColumn[] = [
        { id: 'author', column: 'author', type: 'string', relation: { sort: 'name', sortDir: 'asc' } } as any,
      ];
      const result = enrichIncludeWithSort([{ relation: 'author' }], columns);
      expect(result?.[0]).toMatchObject({ relation: 'author', orderBy: { name: 'asc' } });
    });

    it('nested sort path from column relation.sort', () => {
      const columns: JsonColumn[] = [
        { id: 'author', column: 'author', type: 'string', relation: { sort: 'origin.country', sortDir: 'desc' } } as any,
      ];
      const result = enrichIncludeWithSort([{ relation: 'author' }], columns);
      expect(result?.[0]).toMatchObject({
        relation: 'author',
        orderBy: { origin: { country: 'desc' } },
      });
    });

    it('returns entry unchanged when column has no sort config', () => {
      const columns: JsonColumn[] = [
        { id: 'author', column: 'author', type: 'string' } as any,
      ];
      const result = enrichIncludeWithSort([{ relation: 'author' }], columns);
      expect(result?.[0]).toEqual({ relation: 'author' });
    });
  });
});
