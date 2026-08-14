import { parseDate } from '../readonly/displayValue/formatDate';

/** One cell of the 6x7 month grid rendered by `DatePicker.vue`. */
export type DateGridCell = {
  /** The day this cell represents, as a UTC instant at midnight. */
  date: Date;
  /** `yyyy-MM-dd` — stable Vue key and cheap comparison handle. */
  key: string;
  /** Day of month, 1-31. */
  day: number;
  /** `false` for the leading/trailing days borrowed from adjacent months. */
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  /** Outside the `min`/`max` bounds. */
  disabled: boolean;
};

const MS_PER_DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Whether a control renders a time alongside the date.
 *
 * An explicit `withTime` option wins, then the uischema `format`
 * (`dateTime` / `date`), and only then the JSON schema's own `format`. The
 * schema check comes last on purpose: crouton-core stamps *every* Prisma
 * `DateTime` column as `format: 'date-time'`, so it can't distinguish a
 * date-only field from a timestamp on its own.
 */
export const resolveWithTime = (
  options?: Record<string, any> | null,
  schema?: Record<string, any> | null,
): boolean => {
  if (typeof options?.withTime === 'boolean') return options.withTime;
  if (options?.format === 'dateTime') return true;
  if (options?.format === 'date') return false;
  return schema?.format === 'date-time';
};

/** `yyyy-MM-dd` for a date, read in UTC. */
export const toDateKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;

/**
 * Value for a native `<input type="date">` / `<input type="datetime-local">`.
 *
 * Read in UTC so the day shown always matches the stored instant. This mirrors
 * `formatDate`'s `timeZone: 'UTC'` default, which keeps edit mode and readonly
 * mode from disagreeing by a day for users west/east of UTC.
 */
export const toInputValue = (value: unknown, withTime = false): string => {
  const date = parseDate(value);
  if (!date) return '';

  const datePart = toDateKey(date);
  if (!withTime) return datePart;

  return `${datePart}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
};

/**
 * Inverse of {@link toInputValue}: turn the input element's string into a full
 * ISO 8601 UTC instant.
 *
 * Returns `undefined` for empty, partial or impossible input (`2026-02-31`) so
 * the field persists as SQL `NULL` rather than an empty string — the same
 * collapse-to-undefined behaviour `DateRangeControlRenderer` relies on.
 */
export const fromInputValue = (
  raw: string | null | undefined,
  withTime = false,
): string | undefined => {
  if (!raw) return undefined;

  const [datePart, timePart] = raw.split('T');
  const [year, month, day] = (datePart ?? '').split('-').map(Number);
  if (![year, month, day].every((n) => Number.isInteger(n))) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  let hours = 0;
  let minutes = 0;
  if (withTime && timePart) {
    const [h, m] = timePart.split(':').map(Number);
    if (Number.isInteger(h)) hours = h;
    if (Number.isInteger(m)) minutes = m;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;

  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  // Date.UTC silently rolls over (Feb 31 -> Mar 3); reject instead of guessing.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    return undefined;

  return date.toISOString();
};

/**
 * Build an ISO instant for `day`, keeping the time-of-day already stored in
 * `base` when the control shows a time. Picking a day should never silently
 * reset the hour a user typed.
 */
export const composeIso = (
  day: Date,
  base: unknown,
  withTime = false,
): string => {
  const existing = withTime ? parseDate(base) : null;

  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      existing?.getUTCHours() ?? 0,
      existing?.getUTCMinutes() ?? 0,
    ),
  ).toISOString();
};

/** Move `delta` months from a 0-indexed `{ year, month }` pair. */
export const shiftMonth = (year: number, month: number, delta: number) => {
  const total = year * 12 + month + delta;

  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
};

/** Midnight-UTC timestamp for a min/max bound, or `null` when unset. */
const toBound = (value: unknown): number | null => {
  const date = parseDate(value);
  if (!date) return null;

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const isWithinBounds = (
  day: Date,
  min?: unknown,
  max?: unknown,
): boolean => {
  const dayMs = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
  );
  const minMs = toBound(min);
  const maxMs = toBound(max);

  return (
    (minMs === null || dayMs >= minMs) && (maxMs === null || dayMs <= maxMs)
  );
};

/**
 * A fixed 42-cell (6 week) grid for the given month. Fixed height keeps the
 * popover from resizing as the user pages through months.
 */
export const buildMonthGrid = ({
  year,
  month,
  selected,
  min,
  max,
  firstDayOfWeek = 1,
  today,
}: {
  year: number;
  /** 0-indexed, matching `Date.getUTCMonth()`. */
  month: number;
  selected?: unknown;
  min?: unknown;
  max?: unknown;
  /** 0 = Sunday, 1 = Monday. @default 1 */
  firstDayOfWeek?: number;
  /** Injectable "today" so tests don't depend on the clock. */
  today?: Date;
}): DateGridCell[] => {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  // Leading days borrowed from the previous month.
  const lead = (firstOfMonth.getUTCDay() - firstDayOfWeek + 7) % 7;
  // Negative day-of-month rolls back into the previous month, which is what we want.
  const start = Date.UTC(year, month, 1 - lead);

  const todayKey = toDateKey(today ?? new Date());
  const selectedDate = parseDate(selected);
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;

  return Array.from({ length: 42 }, (_, i) => {
    // Safe arithmetic: UTC has no DST, so every day is exactly 24h.
    const date = new Date(start + i * MS_PER_DAY);
    const key = toDateKey(date);

    return {
      date,
      key,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month && date.getUTCFullYear() === year,
      isToday: key === todayKey,
      isSelected: key === selectedKey,
      disabled: !isWithinBounds(date, min, max),
    };
  });
};

/** Localised weekday abbreviations, rotated to start at `firstDayOfWeek`. */
export const weekdayLabels = (
  locale = 'en-GB',
  firstDayOfWeek = 1,
): string[] => {
  const format = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  });

  // 2024-01-07 was a Sunday, so index 0 lines up with getUTCDay() === 0.
  return Array.from({ length: 7 }, (_, i) =>
    format.format(new Date(Date.UTC(2024, 0, 7 + ((firstDayOfWeek + i) % 7)))),
  );
};

/** Localised "August 2026" heading for the popover. */
export const monthLabel = (year: number, month: number, locale = 'en-GB') =>
  new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month, 1)));
