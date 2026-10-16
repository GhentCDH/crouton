import { describe, expect, it } from 'vitest';

import { defaultLayoutFor } from './default-layout';
import type { JsonColumn } from '../../resource/Column';

const col = (id: string, pos: number, extra: Partial<JsonColumn> = {}): JsonColumn =>
  ({
    id,
    hiddenInTable: false,
    hiddenInForm: false,
    hiddenInView: false,
    fieldInput: { type: 'text', position: pos },
    ...extra,
  } as JsonColumn);

describe('defaultLayoutFor', () => {
  describe('form', () => {
    it('returns items ordered by position, hiddenInForm excluded', () => {
      const cols = [col('b', 2), col('a', 1), col('c', 3, { hiddenInForm: true })];
      const layout = defaultLayoutFor('form', cols);
      expect(layout?.items).toEqual(['a', 'b']);
    });

    it('returns undefined when all columns hidden', () => {
      expect(defaultLayoutFor('form', [col('a', 1, { hiddenInForm: true })])).toBeUndefined();
    });
  });

  describe('view', () => {
    it('returns items ordered by position, hiddenInView excluded', () => {
      const cols = [col('b', 2), col('a', 1), col('c', 3, { hiddenInView: true })];
      const layout = defaultLayoutFor('view', cols);
      expect(layout?.items).toEqual(['a', 'b']);
    });
  });

  describe('table', () => {
    it('returns items ordered by position, hiddenInTable excluded', () => {
      const cols = [col('b', 2), col('a', 1), col('c', 3, { hiddenInTable: true })];
      const layout = defaultLayoutFor('table', cols);
      expect(layout?.items).toEqual(['a', 'b']);
    });

    it('table layout includes empty filterFields/rowActions/tableActions', () => {
      const layout = defaultLayoutFor('table', [col('a', 1)]);
      expect(layout).toMatchObject({ filterFields: [], rowActions: [], tableActions: [] });
    });

    it('returns undefined when all columns hidden', () => {
      expect(defaultLayoutFor('table', [col('a', 1, { hiddenInTable: true })])).toBeUndefined();
    });
  });

  it('returns undefined for empty column list', () => {
    expect(defaultLayoutFor('form', [])).toBeUndefined();
    expect(defaultLayoutFor('view', [])).toBeUndefined();
    expect(defaultLayoutFor('table', [])).toBeUndefined();
  });
});
