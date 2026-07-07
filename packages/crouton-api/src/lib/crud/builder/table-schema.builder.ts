import { BooleanCellBuilder, TableBuilder, TextCellBuilder } from '@ghentcdh/crouton-core';

import type { JsonColumn } from '../loader/json-config.types';
import { isBoolean, isDateRange, isRecordCell } from './column-predicates';
import { deriveSortId } from './sort.helpers';

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