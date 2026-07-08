import { ZodArray, ZodNullable, type ZodObject, ZodOptional, type ZodRawShape } from 'zod';

import type { JsonColumn, RelationType } from '@ghentcdh/crouton-core';

/** Recursively unwrap Optional / Nullable wrappers to reach the inner Zod type. */
export const unwrapZodType = (type: any): any => {
  if (type instanceof ZodOptional || type instanceof ZodNullable) {
    return unwrapZodType(type.unwrap());
  }
  return type;
};

/**
 * Derive the `RelationType` for a column from the Zod schema field:
 * - `ZodArray`  → `'oneToMany'`
 * - `ZodObject` → `'manyToOne'` (embedded single record)
 * - scalar (number / string FK) → `'manyToOne'`
 * - absent from schema → `undefined` (can't determine)
 */
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

/**
 * Heuristic `relationType` for when no Zod schema is available (sub-resources):
 * a relation column with a sibling scalar foreign-key column (`<name>_id`) is a
 * single reference (`manyToOne`); otherwise it's a collection (`oneToMany`).
 */
export const deriveRelationTypeFromColumns = (
  col: JsonColumn,
  cols: JsonColumn[],
): RelationType => {
  const base = col.column ?? col.id;
  const fkNames = new Set([`${base}_id`, `${col.id}_id`]);
  return cols.some((c) => fkNames.has(c.id)) ? 'manyToOne' : 'oneToMany';
};

/**
 * Enrich columns that declare a relation `fieldInput` (type `"autocomplete"` or
 * format `"relation"`) with a `relationType` derived from the Zod schema,
 * **unless** the column already has an explicit `relationType` set.
 */
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
    if (fi.relationType) return col; // explicit wins
    const derived =
      deriveRelationType(schema, col.id) ??
      deriveRelationTypeFromColumns(col, columns);
    if (!derived) return col;
    return { ...col, fieldInput: { ...fi, relationType: derived } };
  });
};