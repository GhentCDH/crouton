import type { ZodObject, ZodRawShape } from 'zod';

import { type JsonColumn, type JsonResourceOperations, isRelation } from '@ghentcdh/crouton-core';

import { type OperationDef, type ResourceDefinition, type UpsertOperationDef } from '../resource/defintion.schema';
import { type SchemaInput } from '../resource/json.schema';

/** Narrow a Zod object schema to the set of column ids listed in JSON. */
export const pickByColumns = (
  schema: ZodObject<ZodRawShape> | undefined,
  columns: JsonColumn[] | undefined,
  filter?: (col: JsonColumn) => boolean,
): SchemaInput | undefined => {
  if (!schema) return undefined;
  if (!columns?.length) return schema;
  // Relation columns are managed via sub-resource endpoints — always exclude from write schemas.
  const baseFilter = (c: JsonColumn) =>
    !isRelation(c) && (filter ? filter(c) : true);
  const schemaKeys = new Set(Object.keys(schema.shape));
  const filtered = columns.filter((c) => baseFilter(c) && schemaKeys.has(c.id));
  if (!filtered.length) return undefined;
  const mask = Object.fromEntries(filtered.map((c) => [c.id, true as const]));
  return schema.pick(mask as any) as SchemaInput;
};

export const opWithSchema = (
  enabled: boolean | undefined,
  schema: SchemaInput | undefined,
): OperationDef | undefined => {
  // `undefined` means the key was omitted → default to enabled.
  if (enabled === false) return undefined;
  return schema ? { schema } : true;
};

type BoolOrUpsert = boolean | { upsertOn: string | string[] };

export const upsertOp = (
  entry: BoolOrUpsert | undefined,
  schema: SchemaInput | undefined,
): UpsertOperationDef | undefined => {
  if (!entry) return undefined;
  if (entry === true) {
    throw new Error(
      '`operations.upsert` must be an object with `upsertOn`, not `true`.',
    );
  }
  if (typeof entry === 'object') {
    return { upsertOn: entry.upsertOn, ...(schema && { schema }) };
  }
  return undefined;
};

export const buildResourceDefinitions = (
  schema: ZodObject<ZodRawShape> | undefined,
  operations: JsonResourceOperations,
  enrichedColumns: JsonColumn[] | undefined,
) => {
  const picked = pickByColumns(schema, enrichedColumns);
  const createSchema = pickByColumns(
    schema,
    enrichedColumns,
    (c) => !c.idField && c.createable !== false,
  );
  const updateSchema = pickByColumns(
    schema,
    enrichedColumns,
    (c) => !c.idField && c.updateable !== false,
  );

  const definition: ResourceDefinition = {
    ...(opWithSchema(operations.findAll, picked) && {
      findAll: opWithSchema(operations.findAll, picked)!,
    }),
    ...(opWithSchema(operations.findOne, picked) && {
      findOne: opWithSchema(operations.findOne, picked)!,
    }),
    ...(opWithSchema(operations.create, createSchema) && {
      create: opWithSchema(operations.create, createSchema)!,
    }),
    ...(opWithSchema(operations.update, updateSchema) && {
      update: opWithSchema(operations.update, updateSchema)!,
    }),
    ...(upsertOp(operations.upsert, createSchema) && {
      upsert: upsertOp(operations.upsert, createSchema)!,
    }),
    ...(operations.patch !== false && { patch: true }),
    ...(operations.delete !== false && { delete: true }),
  };

  return definition;
};
