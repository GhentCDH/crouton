/**
 * Helpers for the `{ value, label }` envelope used by enum/select columns.
 *
 * The DB stores a bare scalar; the API can wrap it into `{ value, label }` on
 * read (so the UI shows a human-readable label) and unwrap it back to the
 * scalar on write. These helpers are pure and shared by the read/write paths.
 */

export interface ValueLabelOption {
  value: unknown;
  label: string;
}

export interface ValueLabel {
  value: unknown;
  label: string;
}

const wrapOne = (value: unknown, values: ValueLabelOption[]): ValueLabel => {
  const match = values.find((o) => o.value === value);
  return { value, label: match ? match.label : String(value) };
};

/**
 * Wrap a stored scalar into `{ value, label }` using the option list.
 * - `null` / `undefined` pass through unchanged (never wrapped).
 * - An array (multi-value enum) is mapped element-wise.
 * - A value missing from `values` falls back to `label = String(value)`.
 */
export const toValueLabel = (
  value: unknown,
  values: ValueLabelOption[],
): unknown => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => wrapOne(v, values));
  return wrapOne(value, values);
};

/**
 * Unwrap a `{ value, label }` (or array of them) back to the bare scalar for
 * persistence / filtering. Plain scalars pass through unchanged (idempotent).
 */
export const fromValueLabel = (input: unknown): unknown => {
  if (Array.isArray(input)) return input.map(fromValueLabel);
  if (input && typeof input === 'object' && 'value' in (input as object)) {
    return (input as { value: unknown }).value;
  }
  return input;
};
