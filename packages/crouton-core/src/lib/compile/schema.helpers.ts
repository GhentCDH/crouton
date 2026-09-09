import type { ZodObject, ZodRawShape } from 'zod';

import type { JsonResourceOperations } from '../data-source';
import type { JsonColumn } from '../resource';
import { isRelation } from '../view';
import type { OperationDef, ResourceDefinition, UpsertOperationDef } from './definition.schema';
import type { SchemaInput } from './schema-input';

export const pickByColumns = (
  schema: ZodObject<ZodRawShape> | undefined,
  columns: JsonColumn[] | undefined,
  filter?: (col: JsonColumn) => boolean,
): SchemaInput | undefined => {
  if (!schema) return undefined;
  if (!columns?.length) return schema;
  const baseFilter = (c: JsonColumn) =>
    !isRelation(c) && (filter ? filter(c) : true);
  const schemaKeys = new Set(Object.keys(schema.shape));
  const filtered = columns.filter((c) => baseFilter(c) && schemaKeys.has(c.id));
  if (!filtered.length) return undefined;
  const mask = Object.fromEntries(filtered.map((c) => [c.id, true as const]));
  return schema.pick(mask as any) as SchemaInput;
};

const opWithSchema = (
  enabled: boolean | Record<string, unknown> | undefined,
  schema: SchemaInput | undefined,
): OperationDef | undefined => {
  if (enabled === false) return undefined;
  if (typeof enabled === 'object' && enabled !== null && 'route' in enabled) {
    return { route: enabled['route'] as string, ...(enabled['method'] ? { method: enabled['method'] as string } : {}) };
  }
  return schema ? { schema } : true;
};

type BoolOrUpsert = boolean | { upsertOn: string | string[] };

const upsertOp = (
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
): ResourceDefinition => {
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

  return {
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
    ...(opWithSchema(operations.patch as any, undefined) && {
      patch: opWithSchema(operations.patch as any, undefined)!,
    }),
    ...(opWithSchema(operations.delete as any, undefined) && {
      delete: opWithSchema(operations.delete as any, undefined)!,
    }),
  };
};
