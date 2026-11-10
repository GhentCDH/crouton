import { describe, expect, it } from 'vitest';

import { editVisibleFor, rowValueInList } from './resource.edit-requires';

const req = {
  field: 'origin',
  values: [
    { value: 'internal', label: 'Internal' },
    { value: 'wikidata', label: 'Wikidata' },
  ],
};

describe('rowValueInList', () => {
  it('matches scalars inside the restriction', () => {
    expect(rowValueInList({ origin: 'internal' }, req)).toBe(true);
    expect(rowValueInList({ origin: 'wikidata' }, req)).toBe(true);
  });

  it('rejects values outside the restriction', () => {
    expect(rowValueInList({ origin: 'anonymous' }, req)).toBe(false);
    expect(rowValueInList({ origin: null }, req)).toBe(false);
    expect(rowValueInList({}, req)).toBe(false);
  });

  it('unwraps the { value, label } envelope the API wraps on list rows', () => {
    expect(rowValueInList({ origin: { value: 'internal', label: 'Internal' } }, req)).toBe(true);
    expect(rowValueInList({ origin: { value: 'anonymous', label: 'anonymous' } }, req)).toBe(false);
  });

  it('handles multi-select arrays (every element must be allowed)', () => {
    expect(rowValueInList({ origin: ['internal', 'wikidata'] }, req)).toBe(true);
    expect(rowValueInList({ origin: ['internal', 'anonymous'] }, req)).toBe(false);
    expect(rowValueInList({ origin: [{ value: 'internal' }, { value: 'anonymous' }] }, req)).toBe(false);
  });
});

describe('editVisibleFor', () => {
  it('is visible without restrictions', () => {
    expect(editVisibleFor({ origin: 'anonymous' }, undefined)).toBe(true);
    expect(editVisibleFor({ origin: 'anonymous' }, [])).toBe(true);
  });

  it('is visible when all restricted columns are in scope', () => {
    expect(
      editVisibleFor(
        { origin: 'internal', direction: 'rtl' },
        [req, { field: 'direction', values: [{ value: 'rtl' }] }],
      ),
    ).toBe(true);
  });

  it('is hidden when any restricted column is out of scope', () => {
    expect(editVisibleFor({ origin: 'anonymous' }, [req])).toBe(false);
    expect(
      editVisibleFor(
        { origin: 'internal', direction: 'ltr' },
        [req, { field: 'direction', values: [{ value: 'rtl' }] }],
      ),
    ).toBe(false);
  });
});
