import type { JsonSchema } from '@jsonforms/core';

import type { TextCellType } from './table.builder';
import { findProperty } from '../schema.utils';

export type ColumnDef = TextCellType & { id: string; label: string };

export const findColumnDef = (
  column: TextCellType,
  schema: JsonSchema,
): TextCellType & { id: string } => {
  const { id, property } = findProperty(column, schema);
  return { ...column, id, ...property };
};
