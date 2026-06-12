import { BooleanCellBuilder, TableBuilder, TextCellBuilder } from '@ghentcdh/crouton-core';

import type { JsonColumn } from './json-config.types';

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

// ── Sort helpers ──────────────────────────────────────────────────────────

/**
 * Derive the sort key for a column:
 * - Explicit `sortId` wins.
 * - Nested relation column: `${column ?? id}.${displayKey}` (e.g. `author.origin_name`).
 * - Plain column: `col.id`.
 * Returns `null` when `sortable: false`.
 */
export const deriveSortId = (col: JsonColumn): string | null => {
  if (col.sortable === false) return null;
  if (col.sortId) return col.sortId;
  const base = col.column ?? col.id;
  if (col.displayKey) return `${base}.${col.displayKey}`;
  return col.id;
};

/**
 * Pick the best default sort column:
 * 1. Explicit `defaultSort: true` column that is also sortable.
 * 2. First sortable visible column.
 * 3. The idField column as a last resort.
 */
export const resolveDefaultSort = (
  tableCols: JsonColumn[],
  allColumns: JsonColumn[] | undefined,
): string | undefined => {
  const isSortable = (c: JsonColumn) => c.sortable !== false;
  const sortCol =
    tableCols.find((c) => c.defaultSort && isSortable(c)) ??
    tableCols.find(isSortable) ??
    allColumns?.find((c) => c.idField);
  return sortCol ? (deriveSortId(sortCol) ?? sortCol.id) : undefined;
};

// ── Table UI schema builder ───────────────────────────────────────────────

/**
 * Field-input options that are also meaningful in table cells, so the table
 * can reuse the same logic as the form (e.g. mapping a select's stored value
 * to its label, or resolving a referenced resource):
 * - `values` / `storeValue` — select options
 * - `uri` / `resourceUri` / `schemasUri` — injected resource references
 */
const SHARED_CELL_OPTION_KEYS = ['values', 'storeValue', 'uri', 'resourceUri', 'schemasUri'] as const;

/** Pick the shared (form ↔ table) option keys from a column's `fieldInput.options`. */
export const pickSharedCellOptions = (col: JsonColumn): Record<string, unknown> => {
  const options = (col.fieldInput?.options ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    SHARED_CELL_OPTION_KEYS.filter((key) => options[key] !== undefined).map((key) => [key, options[key]]),
  );
};

/** Build the TableBuilder UI schema — one TextCell / BooleanCell per visible column. */
export const buildTableUiSchema = (cols: JsonColumn[]): Record<string, unknown> => {
  const layout = TableBuilder.init<any>()
    .addControls(
      ...cols.map((col) => {
        const cellBuilder = isBoolean(col) ? BooleanCellBuilder : TextCellBuilder;
        let builder = cellBuilder.properties<any>(col.id as keyof any);
        if (col.displayKey) builder = builder.key(col.displayKey);
        if (col.sortId) builder = builder.setSortId(col.sortId);
        return builder;
      }),
    )
    .build() as any;

  const colMap = Object.fromEntries(cols.map((c) => [c.id, c]));
  layout.elements = (layout.elements as any[]).map((el: any) => {
    const id = el.scope?.replace('#/properties/', '');
    const col = id ? colMap[id] : undefined;
    if (!col) return el;
    // Record cells get all fieldInput options; plain cells still receive the
    // shared ones (select values, resource URIs) so they can reuse form logic.
    const fieldInputOptions = isRecordCell(col)
      ? (col.fieldInput?.options as object ?? {})
      : pickSharedCellOptions(col);
    const dataPathOption = col.column ? { dataPath: col.column } : {};
    const derivedSortId = isRecordCell(col) ? null : deriveSortId(col);
    const sortOptions = derivedSortId ? { sortId: derivedSortId } : { sortable: false };
    const relationTypeOption = col.fieldInput?.relationType ? { relationType: col.fieldInput.relationType } : {};
    return {
      ...el,
      options: { ...(el.options ?? {}), ...fieldInputOptions, ...dataPathOption, ...sortOptions, ...relationTypeOption, label: col.label },
      ...(isRecordCell(col) && { type: 'RecordCell' }),
    };
  });

  return layout as Record<string, unknown>;
};
