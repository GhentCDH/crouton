import { describe, expect, it } from 'vitest';

import {
  buildMonthGrid,
  composeIso,
  fromInputValue,
  isWithinBounds,
  monthLabel,
  resolveWithTime,
  shiftMonth,
  toDateKey,
  toInputValue,
  weekdayLabels,
} from '../useDateModel';

describe('toInputValue', () => {
  it('renders date-only in UTC', () => {
    expect(toInputValue('2026-08-14T00:00:00.000Z')).toBe('2026-08-14');
  });

  it('renders date + time when withTime', () => {
    expect(toInputValue('2026-08-14T09:30:00.000Z', true)).toBe(
      '2026-08-14T09:30',
    );
  });

  it('pads single-digit month, day, hour and minute', () => {
    expect(toInputValue('2026-01-02T03:04:00.000Z', true)).toBe(
      '2026-01-02T03:04',
    );
  });

  it.each([null, undefined, '', 'not a date'])('returns "" for %p', (value) => {
    expect(toInputValue(value)).toBe('');
  });
});

describe('fromInputValue', () => {
  it('expands a date-only input to midnight UTC', () => {
    expect(fromInputValue('2026-08-14')).toBe('2026-08-14T00:00:00.000Z');
  });

  it('keeps the time when withTime', () => {
    expect(fromInputValue('2026-08-14T09:30', true)).toBe(
      '2026-08-14T09:30:00.000Z',
    );
  });

  it('drops the time when the control is date-only', () => {
    expect(fromInputValue('2026-08-14T09:30', false)).toBe(
      '2026-08-14T00:00:00.000Z',
    );
  });

  it.each([
    ['empty', ''],
    ['null', null],
    ['undefined', undefined],
    ['partial year', '202'],
    ['partial date', '2026-08'],
    ['non-numeric', 'yyyy-mm-dd'],
    ['impossible day', '2026-02-31'],
    ['month 13', '2026-13-01'],
    ['day 0', '2026-08-00'],
  ])('returns undefined for %s', (_label, raw) => {
    expect(fromInputValue(raw as string | null | undefined)).toBeUndefined();
  });

  it('rejects an out-of-range time instead of rolling over', () => {
    expect(fromInputValue('2026-08-14T25:00', true)).toBeUndefined();
  });

  it('accepts a real leap day', () => {
    expect(fromInputValue('2024-02-29')).toBe('2024-02-29T00:00:00.000Z');
  });

  it('rejects a leap day in a non-leap year', () => {
    expect(fromInputValue('2026-02-29')).toBeUndefined();
  });
});

describe('round-trip', () => {
  it.each(['2026-08-14', '2024-02-29', '1999-12-31'])(
    'date-only %s survives both directions',
    (input) => {
      expect(toInputValue(fromInputValue(input))).toBe(input);
    },
  );

  it('date + time survives both directions', () => {
    const input = '2026-08-14T23:59';
    expect(toInputValue(fromInputValue(input, true), true)).toBe(input);
  });

  /**
   * The whole reason the helpers are UTC-based: a browser in UTC+2 must not
   * turn a picked 14 Aug into a stored 13 Aug.
   */
  it('does not shift the day regardless of host timezone', () => {
    const iso = fromInputValue('2026-08-14');
    expect(iso).toBe('2026-08-14T00:00:00.000Z');
    expect(toInputValue(iso)).toBe('2026-08-14');
  });
});

describe('composeIso', () => {
  const day = new Date(Date.UTC(2026, 7, 14));

  it('keeps the existing time-of-day when withTime', () => {
    expect(composeIso(day, '2026-01-01T09:30:00.000Z', true)).toBe(
      '2026-08-14T09:30:00.000Z',
    );
  });

  it('uses midnight when the control is date-only', () => {
    expect(composeIso(day, '2026-01-01T09:30:00.000Z', false)).toBe(
      '2026-08-14T00:00:00.000Z',
    );
  });

  it('uses midnight when there is no previous value', () => {
    expect(composeIso(day, null, true)).toBe('2026-08-14T00:00:00.000Z');
  });
});

describe('resolveWithTime', () => {
  it.each`
    description                             | options                               | schema                     | result
    ${'explicit withTime wins over format'} | ${{ format: 'date', withTime: true }} | ${{}}                      | ${true}
    ${'explicit withTime false wins'}       | ${{ withTime: false }}                | ${{ format: 'date-time' }} | ${false}
    ${'format dateTime'}                    | ${{ format: 'dateTime' }}             | ${{}}                      | ${true}
    ${'format date beats schema date-time'} | ${{ format: 'date' }}                 | ${{ format: 'date-time' }} | ${false}
    ${'falls back to schema date-time'}     | ${{}}                                 | ${{ format: 'date-time' }} | ${true}
    ${'schema date is date-only'}           | ${{}}                                 | ${{ format: 'date' }}      | ${false}
    ${'nothing set'}                        | ${undefined}                          | ${undefined}               | ${false}
  `('$description -> $result', ({ options, schema, result }) => {
    expect(resolveWithTime(options, schema)).toBe(result);
  });
});

describe('shiftMonth', () => {
  it.each`
    year    | month | delta  | expected
    ${2026} | ${7}  | ${1}   | ${{ year: 2026, month: 8 }}
    ${2026} | ${11} | ${1}   | ${{ year: 2027, month: 0 }}
    ${2026} | ${0}  | ${-1}  | ${{ year: 2025, month: 11 }}
    ${2026} | ${0}  | ${-13} | ${{ year: 2024, month: 11 }}
    ${2026} | ${5}  | ${12}  | ${{ year: 2027, month: 5 }}
  `('$year-$month shifted by $delta', ({ year, month, delta, expected }) => {
    expect(shiftMonth(year, month, delta)).toEqual(expected);
  });
});

describe('isWithinBounds', () => {
  const day = new Date(Date.UTC(2026, 7, 14));

  it('is unbounded when no min/max given', () => {
    expect(isWithinBounds(day)).toBe(true);
  });

  it('includes the boundary days themselves', () => {
    expect(isWithinBounds(day, '2026-08-14', '2026-08-14')).toBe(true);
  });

  it('rejects a day before min', () => {
    expect(isWithinBounds(day, '2026-08-15')).toBe(false);
  });

  it('rejects a day after max', () => {
    expect(isWithinBounds(day, undefined, '2026-08-13')).toBe(false);
  });

  it('ignores the time-of-day of the bound', () => {
    expect(isWithinBounds(day, '2026-08-14T23:59:00.000Z')).toBe(true);
  });
});

describe('buildMonthGrid', () => {
  const today = new Date(Date.UTC(2026, 7, 14));
  const grid = buildMonthGrid({ year: 2026, month: 7, today });

  it('always returns six full weeks', () => {
    expect(grid).toHaveLength(42);
  });

  it('starts on the configured first day of the week', () => {
    // 1 Aug 2026 is a Saturday, so a Monday-first grid leads with 27 Jul.
    expect(grid[0].key).toBe('2026-07-27');
    expect(grid[0].inMonth).toBe(false);
  });

  it('respects firstDayOfWeek = 0 (Sunday)', () => {
    const sundayFirst = buildMonthGrid({
      year: 2026,
      month: 7,
      firstDayOfWeek: 0,
      today,
    });
    expect(sundayFirst[0].key).toBe('2026-07-26');
  });

  it('marks the in-month days', () => {
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  it('runs consecutively with no gaps', () => {
    const keys = grid.map((cell) => cell.key);
    expect(new Set(keys).size).toBe(42);
    expect(keys.at(-1)).toBe(toDateKey(new Date(Date.UTC(2026, 8, 6))));
  });

  it('flags today exactly once', () => {
    expect(grid.filter((cell) => cell.isToday)).toHaveLength(1);
    expect(grid.find((cell) => cell.isToday)?.key).toBe('2026-08-14');
  });

  it('flags the selected day', () => {
    const selected = buildMonthGrid({
      year: 2026,
      month: 7,
      selected: '2026-08-20T13:45:00.000Z',
      today,
    });
    expect(selected.filter((cell) => cell.isSelected)).toHaveLength(1);
    expect(selected.find((cell) => cell.isSelected)?.key).toBe('2026-08-20');
  });

  it('disables days outside min/max', () => {
    const bounded = buildMonthGrid({
      year: 2026,
      month: 7,
      min: '2026-08-10',
      max: '2026-08-20',
      today,
    });
    expect(bounded.filter((cell) => !cell.disabled)).toHaveLength(11);
  });

  it('handles a leap February', () => {
    const feb = buildMonthGrid({ year: 2024, month: 1, today });
    expect(feb.filter((cell) => cell.inMonth)).toHaveLength(29);
  });
});

describe('weekdayLabels', () => {
  it('starts on Monday by default', () => {
    expect(weekdayLabels('en-GB')).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
  });

  it('can start on Sunday', () => {
    expect(weekdayLabels('en-GB', 0)[0]).toBe('Sun');
  });

  it('returns seven labels for any locale', () => {
    expect(weekdayLabels('nl-BE')).toHaveLength(7);
  });
});

describe('monthLabel', () => {
  it('renders month and year', () => {
    expect(monthLabel(2026, 7, 'en-GB')).toBe('August 2026');
  });
});
