export type CsvRow = Record<string, unknown>;

export type CsvColumn = {
  /** Property path in the row (dot-separated for nested values). */
  key: string;
  /** Header text. */
  label: string;
  /** Custom accessor; its result is formatted like any other value (dates, booleans, objects). */
  value?: (row: CsvRow) => unknown;
};

export type CsvOptions = {
  /** Text for `true`. @default 'Yes' */
  yes?: string;
  /** Text for `false`. @default 'No' */
  no?: string;
};

const ISO_DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const pad = (n: number) => String(n).padStart(2, '0');

/** `dd/MM/yyyy` (UTC) — the format Excel parses as a date in `,`-decimal locales. */
const formatDay = (d: Date) =>
  `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

const formatDateTime = (d: Date) =>
  `${formatDay(d)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

const toDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const getPath = (row: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>(
    (acc, k) => (acc != null && typeof acc === 'object' ? (acc as CsvRow)[k] : undefined),
    row,
  );

/** Convert one value to its CSV text: dates as dd/MM/yyyy[ HH:mm], booleans as yes/no, objects by label. */
export const csvValue = (value: unknown, opts: CsvOptions = {}): string => {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? (opts.yes ?? 'Yes') : (opts.no ?? 'No');
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : formatDateTime(value);
  if (typeof value === 'string') {
    if (ISO_DATE_ONLY_RE.test(value)) {
      const d = toDate(value);
      return d ? formatDay(d) : value;
    }
    if (ISO_DATE_TIME_RE.test(value)) {
      const d = toDate(value);
      return d ? formatDateTime(d) : value;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => csvValue(v, opts)).join(', ');
  if (typeof value === 'object') {
    const o = value as CsvRow;
    const display = o['label'] ?? o['name'] ?? o['title'] ?? o['value'] ?? o['id'];
    return display !== undefined ? csvValue(display, opts) : JSON.stringify(value);
  }
  return String(value);
};

const quote = (text: string) => `"${text.replace(/"/g, '""')}"`;

/**
 * Build a CSV string that Excel opens correctly in `,`-decimal locales (e.g. nl-BE):
 * UTF-8 BOM, `;` separator, CRLF line endings, every cell quoted.
 */
export const toCsv = (columns: CsvColumn[], rows: CsvRow[], opts: CsvOptions = {}): string => {
  const header = columns.map((c) => quote(c.label)).join(';');
  const lines = rows.map((row) =>
    columns
      .map((c) => quote(csvValue(c.value ? c.value(row) : getPath(row, c.key), opts)))
      .join(';'),
  );
  return `\uFEFF${[header, ...lines].join('\r\n')}\r\n`;
};

/** Build the CSV and trigger a browser download of `<fileName>.csv`. */
export const downloadCsv = (
  columns: CsvColumn[],
  rows: CsvRow[],
  fileName: string,
  opts: CsvOptions = {},
) => {
  const blob = new Blob([toCsv(columns, rows, opts)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
