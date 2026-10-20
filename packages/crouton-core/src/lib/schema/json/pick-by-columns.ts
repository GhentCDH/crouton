import type { ZodObject, ZodRawShape } from 'zod';

import type { SchemaInput } from './schema-input';
import type { JsonColumn } from '../../resource';
import { isRelation } from '../../view';

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
