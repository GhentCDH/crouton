import { describe, expect, it } from 'vitest';

import { fromValueLabel, toValueLabel } from './value-label';

const values = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

describe('toValueLabel', () => {
  it('wraps a known scalar', () => {
    expect(toValueLabel('a', values)).toEqual({ value: 'a', label: 'Alpha' });
  });
  it('falls back to String(value) for unknown values', () => {
    expect(toValueLabel('z', values)).toEqual({ value: 'z', label: 'z' });
  });
  it('passes null/undefined through unchanged', () => {
    expect(toValueLabel(null, values)).toBeNull();
    expect(toValueLabel(undefined, values)).toBeUndefined();
  });
  it('maps arrays element-wise', () => {
    expect(toValueLabel(['a', 'b'], values)).toEqual([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]);
  });
});

describe('fromValueLabel', () => {
  it('unwraps an object to its value', () => {
    expect(fromValueLabel({ value: 'a', label: 'Alpha' })).toBe('a');
  });
  it('passes plain scalars through (idempotent)', () => {
    expect(fromValueLabel('a')).toBe('a');
    expect(fromValueLabel(null)).toBeNull();
  });
  it('unwraps arrays element-wise', () => {
    expect(fromValueLabel([{ value: 'a', label: 'Alpha' }, 'b'])).toEqual(['a', 'b']);
  });
  it('round-trips with toValueLabel', () => {
    expect(fromValueLabel(toValueLabel('a', values))).toBe('a');
  });
});
