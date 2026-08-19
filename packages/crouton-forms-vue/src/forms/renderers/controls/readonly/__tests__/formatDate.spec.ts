import { describe, expect, it } from 'vitest';

import { formatDate, relativeDate } from '../displayValue/formatDate';

describe('formatDate', () => {
  const iso = '2026-06-05T07:27:20.987Z';

  it.each`
    value        | reason
    ${null}      | ${'null'}
    ${undefined} | ${'undefined'}
    ${''}        | ${'empty string'}
    ${'not-a-date'} | ${'unparseable string'}
  `('returns null for $reason', ({ value }) => {
    expect(formatDate(value)).toBeNull();
  });

  it('formats date + time in UTC by default', () => {
    expect(formatDate(iso)).toBe('5 Jun 2026, 07:27');
  });

  it('omits the time when withTime is false', () => {
    expect(formatDate(iso, { withTime: false })).toBe('5 Jun 2026');
  });

  it('accepts a Date instance', () => {
    expect(formatDate(new Date(iso), { withTime: false })).toBe('5 Jun 2026');
  });

  it('respects an explicit time zone', () => {
    expect(formatDate(iso, { withTime: true, timeZone: 'Europe/Brussels' })).toBe(
      '5 Jun 2026, 09:27',
    );
  });

  it('never appends a relative suffix — that is relativeDate’s job', () => {
    expect(formatDate(iso)).not.toContain('·');
    const now = new Date(iso);
    const past = new Date(now.getTime() - 4 * 24 * 60 * 60_000);
    expect(formatDate(past, { withTime: false })).toBe('1 Jun 2026');
  });
});

describe('relativeDate', () => {
  const iso = '2026-06-05T07:27:20.987Z';

  it.each`
    deltaMs                  | unit       | expected
    ${-4 * 24 * 60 * 60_000} | ${'days'}  | ${'4 days ago'}
    ${-2 * 60 * 60_000}      | ${'hours'} | ${'2 hours ago'}
    ${3 * 24 * 60 * 60_000}  | ${'days'}  | ${'in 3 days'}
  `('describes the offset ($unit)', ({ deltaMs, expected }) => {
    const now = new Date(iso);
    const target = new Date(now.getTime() + deltaMs);
    expect(relativeDate(target, { now })).toBe(expected);
  });

  it('returns undefined for unparseable input', () => {
    expect(relativeDate('not-a-date')).toBeUndefined();
    expect(relativeDate(null)).toBeUndefined();
  });
});
