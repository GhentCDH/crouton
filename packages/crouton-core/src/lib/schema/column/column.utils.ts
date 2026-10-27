import { columnKey } from '@crouton/i18n';
import type { JsonColumn } from '../../resource/Column';
import type { ViewColumnConfig } from '../view/view.schema';

/** Resolve the sort position for a column: `fieldInput.position`, then `col.position`, then natural index. */
export const colPosition = (col: JsonColumn, i: number): number =>
  col.fieldInput?.position ?? col.position ?? i;

/** Sort columns by position; columns without an explicit position keep array order. */
export const sortByPosition = (cols: JsonColumn[]): JsonColumn[] =>
  cols
    .map((col, i) => ({ col, i }))
    .sort((a, b) => colPosition(a.col, a.i) - colPosition(b.col, b.i))
    .map(({ col }) => col);

export type FieldContext = 'form' | 'view' | 'table';

/**
 * Return a copy of the column whose `fieldInput` is the resolved variant for the
 * given rendering context, so downstream builders (which all read `fieldInput`)
 * render the right config without any signature change.
 *
 * After the transformer's `resolveColumnFieldVariants` prefill, `fieldView` and
 * `fieldTable` are already the fully-resolved variants; the `?? col.fieldInput`
 * guard covers TS-authored `resource.ts` resources that bypass the transformer.
 */
export const columnForContext = (
  col: JsonColumn,
  ctx: FieldContext,
): JsonColumn => {
  if (ctx === 'table') return col; // table type/options overrides come from layout.table.controls
  return col; // form / view / filter → base fieldInput
};

export const toViewColumn = (
  col: JsonColumn,
  resourceName?: string,
): ViewColumnConfig => ({
  id: col.id,
  ...(col.label && { label: col.label }),
  labelKey:
    col.labelKey ??
    (resourceName ? columnKey(resourceName, col.id) : undefined),
  ...(col.fieldInput && { fieldInput: col.fieldInput }),
  ...(col.enum && { enumName: col.enum }),
});
