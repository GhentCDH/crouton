import { ZodArray, ZodNullable, type ZodObject, ZodOptional, type ZodRawShape } from 'zod';

import type { JsonColumn, RelationType } from '../resource';

export const unwrapZodType = (type: any): any => {
  if (type instanceof ZodOptional || type instanceof ZodNullable) {
    return unwrapZodType(type.unwrap());
  }
  return type;
};

export const deriveRelationType = (
  schema: ZodObject<ZodRawShape> | undefined,
  columnId: string,
): RelationType | undefined => {
  if (!schema) return undefined;
  const field = schema.shape[columnId];
  if (!field) return undefined;
  const inner = unwrapZodType(field);
  return inner instanceof ZodArray ? 'oneToMany' : 'manyToOne';
};

export const deriveRelationTypeFromColumns = (
  col: JsonColumn,
  cols: JsonColumn[],
): RelationType => {
  const base = col.column ?? col.id;
  const fkNames = new Set([`${base}_id`, `${col.id}_id`]);
  return cols.some((c) => fkNames.has(c.id)) ? 'manyToOne' : 'oneToMany';
};

export const enrichRelationTypes = (
  columns: JsonColumn[],
  schema: ZodObject<ZodRawShape> | undefined,
): JsonColumn[] => {
  if (!schema) return columns;
  return columns.map((col) => {
    const fi = col.fieldInput;
    if (!fi) return col;
    const isRelationField =
      fi.type === 'autocomplete' || fi.format === 'relation';
    if (!isRelationField) return col;
    if (fi.relationType) return col;
    const derived =
      deriveRelationType(schema, col.id) ??
      deriveRelationTypeFromColumns(col, columns);
    if (!derived) return col;
    return { ...col, fieldInput: { ...fi, relationType: derived } };
  });
};
