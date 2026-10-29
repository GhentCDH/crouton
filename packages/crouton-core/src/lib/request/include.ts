import type { JsonColumn } from '../resource/Column';
import { getPrismaRelationField, isRelationColumn } from '../resource/Column';

/**
 * Relation columns a client may request via `?include=`.
 *
 * `tableIds` is the resolved table visibility set (see `resolveLayoutVisibility`).
 * When provided, only relations the table layout renders are includable; without
 * it the column's `hiddenInTable` fallback flag is used.
 */
export const allowedIncludes = (
  columns: JsonColumn[],
  tableIds?: ReadonlySet<string>,
): string[] =>
  columns
    .filter(
      (col) =>
        isRelationColumn(col) &&
        col.relation?.embed !== false &&
        (tableIds ? tableIds.has(col.id) : !col.hiddenInTable),
    )
    .map((col) => col.id);

export const resolveIncludeToRelationField = (columnId: string, columns: JsonColumn[]): string => {
  const col = columns.find((c) => c.id === columnId);
  return col ? getPrismaRelationField(col) : columnId;
};
