import { ZodObject, type ZodRawShape, type ZodType } from 'zod';

import type { JsonResourceOperations, SecurityConfig } from '../../data-source';
import type { JsonColumn } from '../../resource';
import { resolveDefaultToken } from '../../resource/default-tokens';
import { pickByColumns } from '../json/pick-by-columns';
import type { SchemaInput } from '../json/schema-input';
import { isLazyRelationField } from '../zod.utils';
import type { CrudDefinition, OperationDef } from './definition.schema';

const opWithSchema = (
  enabled: boolean | Record<string, unknown> | undefined,
  schema: SchemaInput | undefined,
): OperationDef | undefined => {
  if (enabled === false) return undefined;
  // Per-operation `security` overrides resource-level security — carry it through.
  const security =
    typeof enabled === 'object' && enabled !== null
      ? (enabled['security'] as SecurityConfig | undefined)
      : undefined;
  if (typeof enabled === 'object' && enabled !== null && 'uri' in enabled) {
    return {
      uri: enabled['uri'] as string,
      ...(enabled['method'] ? { method: enabled['method'] as string } : {}),
      ...(security && { security }),
    };
  }
  if (!schema && !security) return true;
  return { ...(schema && { schema }), ...(security && { security }) };
};

/**
 * On create, a column with `fieldInput.defaultValue` (codegen writes it for
 * every Prisma `@default(<literal>)`) is filled in when the client omits it.
 * `prefault` runs the default through parsing (coercion still applies) and is
 * evaluated per request, so `$now` / `$today` are fresh. Tokens that don't
 * resolve server-side (`$user`) leave the field required.
 */
const applyCreateDefaults = (
  schema: SchemaInput | undefined,
  columns: JsonColumn[] | undefined,
): SchemaInput | undefined => {
  if (!(schema instanceof ZodObject)) return schema;
  const shape = schema.shape as Record<string, ZodType>;
  const defaults = (columns ?? [])
    .filter(
      (c) =>
        c.id in shape &&
        resolveDefaultToken(c.fieldInput?.defaultValue) !== undefined,
    )
    .map((c) => [
      c.id,
      shape[c.id].prefault(() => resolveDefaultToken(c.fieldInput?.defaultValue)),
    ]);
  return defaults.length ? schema.extend(Object.fromEntries(defaults)) : schema;
};

export const buildResourceDefinitions = (
  schema: ZodObject<ZodRawShape> | undefined,
  operations: JsonResourceOperations,
  enrichedColumns: JsonColumn[] | undefined,
): CrudDefinition => {
  const picked = pickByColumns(schema, enrichedColumns);
  // A relation key from a `*WithRelationsSchema` listed as a column without a
  // `relation` block is read-only: never required on, or forwarded by, a write (#584).
  const writable = (c: JsonColumn) => {
    const field = schema?.shape[c.id];
    return !c.idField && !(field && isLazyRelationField(field as ZodType));
  };
  const createSchema = applyCreateDefaults(
    pickByColumns(
      schema,
      enrichedColumns,
      (c) => writable(c) && c.creatable !== false,
    ),
    enrichedColumns,
  );
  const updateSchema = pickByColumns(
    schema,
    enrichedColumns,
    (c) => writable(c) && c.updatable !== false,
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
