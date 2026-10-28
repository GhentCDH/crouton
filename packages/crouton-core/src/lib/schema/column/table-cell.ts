import {
  isBoolean,
  isDateRange,
  isObjectCell,
  isRecordCell,
} from './predicates';
import { deriveSortId } from '../../layout/sort.helpers';
import type { JsonColumn } from '../../resource/Column';
import {
  BooleanCellBuilder,
  TableBuilder,
  TextCellBuilder,
} from '../../table/table.builder';

// ── Table UI schema builder ───────────────────────────────────────────────

/**
 * Field-input options that are also meaningful in table cells, so the table
 * can reuse the same logic as the form (e.g. mapping a select's stored value
 * to its label, or resolving a referenced resource):
 * - `values` / `storeValue` — select options
 * - `uri` / `resourceUri` / `schemasUri` — injected resource references
 */
const SHARED_CELL_OPTION_KEYS = [
  'values',
  'storeValue',
  'uri',
  'resourceUri',
  'schemasUri',
  'customComponent',
] as const;

/** Pick the shared (form <-> table) option keys from a column's `fieldInput.options`. */
export const pickSharedCellOptions = (
  col: JsonColumn,
): Record<string, unknown> => {
  const options = (col.fieldInput?.options ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    SHARED_CELL_OPTION_KEYS.filter((key) => options[key] !== undefined).map(
      (key) => [key, options[key]],
    ),
  );
};

/** Build the TableBuilder UI schema — one TextCell / BooleanCell per visible column. */
export const buildTableUiSchema = (
  cols: JsonColumn[],
): Record<string, unknown> => {
  const layout = TableBuilder.init()
    .addControls(
      ...cols.map((col) => {
        const cellBuilder = isBoolean(col)
          ? BooleanCellBuilder
          : TextCellBuilder;
        let builder = cellBuilder.propertiesStr(col.id);
        if (col.displayKey) builder = builder.key(col.displayKey);
        if (col.sortId) builder = builder.setSortId(col.sortId);
        return builder;
      }),
    )
    .build();

  const colMap = Object.fromEntries(cols.map((c) => [c.id, c]));
  const elements = (layout.elements ?? []) as object[] as Record<string, unknown>[];

  const mappedElements = elements.map((el) => {
    const id = (el['scope'] as string | undefined)?.replace('#/properties/', '');
    const col = id ? colMap[id] : undefined;
    if (!col) return el;
    const fieldInputOptions =
      isRecordCell(col) || isDateRange(col) || isObjectCell(col)
        ? ((col.fieldInput?.options as object) ?? {})
        : pickSharedCellOptions(col);
    const dataPathOption = col.column ? { dataPath: col.column } : {};
    const derivedSortId = isDateRange(col) ? null : deriveSortId(col);
    const sortOptions = derivedSortId
      ? { sortId: derivedSortId }
      : { sortable: false };
    const relationType = col.relation?.type ?? col.fieldInput?.relationType;
    const relationTypeOption = relationType ? { relationType } : {};
    return {
      ...el,
      options: {
        ...((el['options'] as Record<string, unknown>) ?? {}),
        ...fieldInputOptions,
        ...dataPathOption,
        ...sortOptions,
        ...relationTypeOption,
        ...(isDateRange(col) && { format: 'date-range' }),
        label: col.label,
      },
      ...((isRecordCell(col) || isObjectCell(col)) && { type: 'RecordCell' }),
      ...(isDateRange(col) && { type: 'Control' }),
    };
  });

  return { ...layout, elements: mappedElements } as Record<string, unknown>;
};
