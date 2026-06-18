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

/** Returns `true` when the column is a date-range control rendered in the table. */
export const isDateRange = (col: JsonColumn): boolean =>
  col.fieldInput?.format === 'date-range';

// ── Sort helpers ──────────────────────────────────────────────────────────

/**
 * Derive the sort key for a column:
 * - Explicit `sortId` wins.
 * - Value/label enum column (`enum` ref or `options.emitObject`): sort by the
 *   scalar column, NOT `${column}.label` — the label is a serialization
 *   envelope, not a DB field, so a nested orderBy would be invalid.
 * - Nested relation column: `${column ?? id}.${displayKey}` (e.g. `author.origin_name`).
 * - Plain column: `col.id`.
 * Returns `null` when `sortable: false`.
 */
export const deriveSortId = (col: JsonColumn): string | null => {
  if (col.sortable === false) return null;
  if (col.sortId) return col.sortId;
  const base = col.column ?? col.id;
  const fi = col.fieldInput;
  const opts = (fi?.options ?? {}) as Record<string, unknown>;

  // Relation columns (autocomplete / `format: relation`) can't be ordered by the
  // bare relation name — Prisma expects a nested `…OrderByWithRelationInput`, not
  // a scalar. Sort by a nested scalar of the related model instead, preferring an
  // explicit `displayKey`, then the autocomplete label/display key. With no usable
  // key the column is not sortable (`null`) rather than crashing at query time.
  const isRelation =
    fi?.format === 'relation' ||
    !!fi?.relationType ||
    fi?.type === 'autocomplete' ||
    typeof opts.resource === 'string';
  if (isRelation) {
    const key =
      (typeof col.displayKey === 'string' ? col.displayKey : undefined) ??
      (typeof opts.displayKey === 'string' ? opts.displayKey : undefined) ??
      (typeof opts.labelKey === 'string' ? opts.labelKey : undefined);
    if (!key) return null;
    const path = key.includes('.') ? key : `${base}.${key}`;
    return path.endsWith('.label') ? path.slice(0, -'.label'.length) : path;
  }

  if (!col.displayKey) return base;
  const path = `${base}.${col.displayKey}`;
  const isValueLabel =
    !!col.enum ||
    (opts as { emitObject?: boolean }).emitObject === true;
  // For value-label columns the displayKey targets the `{value,label}` envelope,
  // which is not a DB field. Sort by the underlying scalar: drop a trailing
  // `.label` while keeping any relation path (e.g. `author.origin.label` →
  // `author.origin`, `text_type.label` → `text_type`).
  if (isValueLabel && path.endsWith('.label')) return path.slice(0, -'.label'.length);
  return path;
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
    // Date-range reuses the form control renderer, so it needs its full options
    // (format, fromField/toField, labels).
    const fieldInputOptions =
      isRecordCell(col) || isDateRange(col)
        ? (col.fieldInput?.options as object ?? {})
        : pickSharedCellOptions(col);
    const dataPathOption = col.column ? { dataPath: col.column } : {};
    const derivedSortId = isRecordCell(col) || isDateRange(col) ? null : deriveSortId(col);
    const sortOptions = derivedSortId ? { sortId: derivedSortId } : { sortable: false };
    const relationTypeOption = col.fieldInput?.relationType ? { relationType: col.fieldInput.relationType } : {};
    return {
      ...el,
      options: {
        ...(el.options ?? {}),
        ...fieldInputOptions,
        ...dataPathOption,
        ...sortOptions,
        ...relationTypeOption,
        ...(isDateRange(col) && { format: 'date-range' }),
        label: col.label,
      },
      ...(isRecordCell(col) && { type: 'RecordCell' }),
      ...(isDateRange(col) && { type: 'Control' }),
    };
  });

  return layout as Record<string, unknown>;
};
