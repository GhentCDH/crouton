import type { JsonColumn } from '../resource/Column';
import { getPrismaRelationField, isRelationColumn } from '../resource/Column';

export const allowedIncludes = (columns: JsonColumn[]): string[] =>
  columns
    .filter((col) => isRelationColumn(col) && !col.hiddenInTable && col.relation?.embed !== false)
    .map((col) => col.id);

export const resolveIncludeToRelationField = (columnId: string, columns: JsonColumn[]): string => {
  const col = columns.find((c) => c.id === columnId);
  return col ? getPrismaRelationField(col) : columnId;
};
