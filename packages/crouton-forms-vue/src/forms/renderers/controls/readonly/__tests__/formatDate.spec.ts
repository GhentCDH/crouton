import { describe, expect, it } from 'vitest';

import { formatDate } from '../formatDate';

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

  it.each`
    deltaMs                  | unit       | expected
    ${-4 * 24 * 60 * 60_000} | ${'days'}  | ${'4 days ago'}
    ${-2 * 60 * 60_000}      | ${'hours'} | ${'2 hours ago'}
    ${3 * 24 * 60 * 60_000}  | ${'days'}  | ${'in 3 days'}
  `('appends relative suffix ($unit)', ({ deltaMs, expected }) => {
    const now = new Date(iso);
    const target = new Date(now.getTime() + deltaMs);
    const out = formatDate(target, { withTime: false, relative: true, now });
    expect(out?.endsWith(`· ${expected}`)).toBe(true);
  });

  it('does not append a relative suffix by default', () => {
    expect(formatDate(iso)).not.toContain('·');
  });
});
