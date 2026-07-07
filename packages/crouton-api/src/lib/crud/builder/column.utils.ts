import type { ViewColumnConfig } from '../crud.config';
import type { JsonColumn } from '../loader/json-config.types';

/** Resolve the sort position for a column: `fieldInput.position`, then natural index. */
export const colPosition = (col: JsonColumn, i: number): number =>
  col.fieldInput?.position ?? i;

/** Sort columns by position; columns without an explicit position keep array order. */
export const sortByPosition = (cols: JsonColumn[]): JsonColumn[] =>
  cols
    .map((col, i) => ({ col, i }))
    .sort((a, b) => colPosition(a.col, a.i) - colPosition(b.col, b.i))
    .map(({ col }) => col);

export const toViewColumn = (col: JsonColumn): ViewColumnConfig => ({
  id: col.id,
  ...(col.label && { label: col.label }),
  ...(col.sortable != null && { sortable: col.sortable }),
  ...(col.searchable != null && { searchable: col.searchable }),
  ...(col.fieldInput && { fieldInput: col.fieldInput }),
});