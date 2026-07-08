import type { JsonColumn } from '@ghentcdh/crouton-core';

// ── Column type helpers ───────────────────────────────────────────────────

/** Returns `true` when the column should render as a boolean (checkbox) cell. */
export const isBoolean = (col: JsonColumn): boolean =>
  col.fieldInput?.type === 'boolean' || col.columnType === 'boolean';

/** Returns `true` when the column is a sub-resource relation (renders an inline sub-table). */
export const isRelation = (col: JsonColumn): boolean =>
  col.fieldInput?.format === 'relation';

/** Returns `true` when the column is an autocomplete FK reference (renders as a `RecordCell`). */
export const isAutocomplete = (col: JsonColumn): boolean =>
  col.fieldInput?.type === 'autocomplete';

/** Returns `true` when the column should render as a `RecordCell` in the table. */
export const isRecordCell = (col: JsonColumn): boolean =>
  isRelation(col) || isAutocomplete(col);

/** Returns `true` when the column is a date-range control rendered in the table. */
export const isDateRange = (col: JsonColumn): boolean =>
  col.fieldInput?.format === 'date-range';