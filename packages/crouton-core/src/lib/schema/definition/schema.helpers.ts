import type { ZodObject, ZodRawShape } from 'zod';

import type { JsonResourceOperations } from '../../data-source';
import type { JsonColumn } from '../../resource';
import { pickByColumns } from '../json/pick-by-columns';
import type { SchemaInput } from '../json/schema-input';
import type { CrudDefinition, OperationDef } from './definition.schema';

const opWithSchema = (
  enabled: boolean | Record<string, unknown> | undefined,
  schema: SchemaInput | undefined,
): OperationDef | undefined => {
  if (enabled === false) return undefined;
  if (typeof enabled === 'object' && enabled !== null && 'uri' in enabled) {
    return {
      uri: enabled['uri'] as string,
      ...(enabled['method'] ? { method: enabled['method'] as string } : {}),
    };
  }
  return schema ? { schema } : true;
};

export const buildResourceDefinitions = (
  schema: ZodObject<ZodRawShape> | undefined,
  operations: JsonResourceOperations,
  enrichedColumns: JsonColumn[] | undefined,
): CrudDefinition => {
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

  const findAll = opWithSchema(operations.findAll, picked);
  const findOne = opWithSchema(operations.findOne, picked);
  const create = opWithSchema(operations.create, createSchema);
  const update = opWithSchema(operations.update, updateSchema);
  const patch = opWithSchema(operations.patch as boolean | Record<string, unknown>, undefined);
  const del = opWithSchema(operations.delete as boolean | Record<string, unknown>, undefined);
  return {
    ...(findAll && { findAll }),
    ...(findOne && { findOne }),
    ...(create && { create }),
    ...(update && { update }),
    ...(patch && { patch }),
    ...(del && { delete: del }),
  };
};
