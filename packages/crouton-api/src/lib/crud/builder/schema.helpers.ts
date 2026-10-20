import type { ZodObject, ZodRawShape } from 'zod';

import { type JsonColumn, type JsonResourceOperations, pickByColumns } from '@ghentcdh/crouton-core';

import { type OperationDef, type ResourceDefinition } from '../resource/defintion.schema';
import { type SchemaInput } from '../resource/json.schema';

export { pickByColumns };

export const opWithSchema = (
  enabled: boolean | Record<string, unknown> | undefined,
  schema: SchemaInput | undefined,
): OperationDef | undefined => {
  // `undefined` means the key was omitted → default to enabled.
  if (enabled === false) return undefined;
  if (typeof enabled === 'object' && enabled !== null && 'uri' in enabled) {
    return { uri: enabled['uri'] as string, ...(enabled['method'] ? { method: enabled['method'] as string } : {}) };
  }
  return schema ? { schema } : true;
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
    ...(opWithSchema(operations.patch as any, undefined) && {
      patch: opWithSchema(operations.patch as any, undefined)!,
    }),
    ...(opWithSchema(operations.delete as any, undefined) && {
      delete: opWithSchema(operations.delete as any, undefined)!,
    }),
  };

  return definition;
};
