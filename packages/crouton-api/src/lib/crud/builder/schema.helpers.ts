import type { ZodObject, ZodRawShape } from 'zod';

import { isRelation } from './column-predicates';
import type { JsonColumn } from '../loader/json-config.types';
import { type OperationDef, type UpsertOperationDef } from '../resource/defintion.schema';
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
  const filtered = columns.filter(baseFilter);
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