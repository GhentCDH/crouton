export type FormatDateOptions = {
  /** Append the time after the date. @default true */
  withTime?: boolean;
  /** Append a relative suffix (e.g. "4 days ago"). @default false */
  relative?: boolean;
  /** BCP-47 locale. @default 'en-GB' */
  locale?: string;
  /**
   * IANA time zone used for rendering. Stored values are UTC, so the default
   * keeps the displayed value deterministic and aligned with the data.
   * @default 'UTC'
   */
  timeZone?: string;
  /** Reference point for the relative suffix. @default new Date() */
  now?: Date;
};

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

const relativeFromNow = (date: Date, now: Date, locale: string): string => {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  for (const [unit, secondsInUnit] of UNITS) {
    if (abs >= secondsInUnit || unit === 'second') {
      return rtf.format(Math.round(diffSeconds / secondsInUnit), unit);
    }
  }
  return rtf.format(0, 'second');
};

/**
 * Format an ISO date/date-time string (or Date) for readonly display.
 * Returns `null` for empty or unparseable input so callers can show a
 * placeholder.
 */
export const formatDate = (
  value: unknown,
  {
    withTime = true,
    locale = 'en-GB',
    timeZone = 'UTC',
  }: FormatDateOptions = {},
): string | null => {
  const date = parseDate(value) as Date;
  if (!date) return null;

  const datePart = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(date);

  let out = datePart;
  if (withTime) {
    const timePart = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).format(date);
    out = `${datePart}, ${timePart}`;
  }

  return out;
};

export const relativeDate = (
  value: unknown,
  { locale = 'en-GB', now }: FormatDateOptions = {},
) => {
  const date = parseDate(value) as Date;
  if (!date) return;

  return relativeFromNow(date, now ?? new Date(), locale);
};

export const parseDate = (value: string | Date | any) => {
  if (value == null || value === '') return null;

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;

  return date;
};

export const isDate = (value: string | Date | any) => {
  return !!parseDate(value);
};
