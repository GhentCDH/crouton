import { BadRequestException } from '@nestjs/common';

import {
  type CrudDefinition,
  type DefinitionCallback,
  type JsonColumn,
  type OperatorType,
  parseFilterString,
  parseListValue,
  toJsonSchema,
} from '@ghentcdh/crouton-core';

export const buildNestedPath = (
  path: string[],
  condition: unknown,
): Record<string, unknown> => {
  if (path.length === 1) return { [path[0]]: condition };
  const [head, ...rest] = path;
  return { [head]: buildNestedPath(rest, condition) };
};

const JSON_PATH_SEP = '->';
const isJsonPath = (field: string): boolean => field.includes(JSON_PATH_SEP);

const buildJsonPathCondition = (
  field: string,
  value: string,
  operator: OperatorType,
): Record<string, unknown> | null => {
  const [column, ...path] = field.split(JSON_PATH_SEP);
  if (!column || path.length === 0) return null;
  const frag = (extra: Record<string, unknown>) => ({ [column]: { path, ...extra } });

  switch (operator) {
    case 'equals': return frag({ equals: value });
    case 'not_equals': return frag({ not: value });
    case 'gt': return frag({ gt: value });
    case 'lt': return frag({ lt: value });
    case 'contains': return frag({ string_contains: value });
    case 'not_contains': return { NOT: frag({ string_contains: value }) };
    default: return null;
  }
};

/** JSON Schema primitive type of a filterable field (`boolean`, `integer`, `number`, `string`, …). */
export type FilterFieldTypes = Record<string, string | undefined>;

/** First non-null `type` of a JSON Schema property (handles `["boolean","null"]` and `anyOf`). */
const primitiveType = (prop: unknown): string | undefined => {
  if (!prop || typeof prop !== 'object') return undefined;
  const p = prop as { type?: unknown; anyOf?: unknown[] };
  if (typeof p.type === 'string') return p.type === 'null' ? undefined : p.type;
  if (Array.isArray(p.type)) return (p.type as string[]).find((t) => t !== 'null');
  return p.anyOf?.map(primitiveType).find(Boolean);
};

/**
 * Field → primitive type for filter coercion: from the findAll schema (the
 * Prisma-derived Zod model), with a column's explicit `type` taking precedence.
 */
export const filterFieldTypes = (
  definition: CrudDefinition | DefinitionCallback | undefined,
  columns: JsonColumn[] = [],
): FilterFieldTypes => {
  const def = typeof definition === 'function' ? definition() : definition;
  const findAll = def?.findAll;
  const schema = findAll && typeof findAll === 'object' && 'schema' in findAll ? findAll.schema : undefined;
  const props = schema
    ? ((toJsonSchema(schema) as { properties?: Record<string, unknown> }).properties ?? {})
    : {};
  const types: FilterFieldTypes = Object.fromEntries(
    Object.entries(props).map(([k, v]) => [k, primitiveType(v)]),
  );
  for (const col of columns) {
    const t = typeof col.type === 'string' ? col.type : primitiveType(col.type);
    if (t) types[col.id] = t;
  }
  return types;
};

/**
 * Coerce a filter value to the field's type. Prisma rejects `{ equals: "true" }`
 * on a Boolean (or `"5"` on an Int) field with a 500, so convert here and turn
 * a value that cannot match the type into a 400 (#557).
 */
const coerce = (value: unknown, field: string, type: string | undefined): unknown => {
  if (type === 'boolean') {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    throw new BadRequestException(`Filter value "${String(value)}" for "${field}" must be true or false`);
  }
  if (type === 'integer' || type === 'number') {
    const num = typeof value === 'number' ? value : Number(value);
    if (value === '' || !Number.isFinite(num))
      throw new BadRequestException(`Filter value "${String(value)}" for "${field}" must be a number`);
    return num;
  }
  return value;
};

const NON_TEXT_TYPES = new Set(['boolean', 'integer', 'number']);

const operatorToCondition = (
  value: string,
  rawOperator: OperatorType,
  field: string,
  type?: string,
): unknown => {
  // `contains` (also the default when no operator is given) is text-only in
  // Prisma; on a boolean/number field it can only mean equality.
  const operator: OperatorType =
    type && NON_TEXT_TYPES.has(type)
      ? rawOperator === 'contains' ? 'equals' : rawOperator === 'not_contains' ? 'not_equals' : rawOperator
      : rawOperator;
  const num = Number(value);
  const numVal = Number.isNaN(num) ? value : num;
  const typed = () => coerce(value, field, type);
  const typedList = (list: unknown[]) => list.map((v) => coerce(v, field, type));
  switch (operator) {
    case 'contains': return { contains: value };
    case 'not_contains': return { not: { contains: value } };
    case 'equals': return { equals: typed() };
    case 'not_equals': return { not: typed() };
    case 'gt': return { gt: numVal };
    case 'lt': return { lt: numVal };
    case 'isnull': return null;
    case 'isnotnull': return { not: null };
    case 'in': {
      const list = parseListValue(value);
      return list.length ? { in: typedList(list) } : undefined;
    }
    case 'not_in': {
      const list = parseListValue(value);
      return list.length ? { notIn: typedList(list) } : undefined;
    }
    default: return undefined;
  }
};

/**
 * Build a Prisma `where` clause from an array of filter strings.
 * Returns `undefined` (no filter) when the array is empty or all entries are unparseable.
 */
export const buildFilterWhere = (
  filter: string[] | undefined,
  fieldTypes: FilterFieldTypes = {},
): Record<string, unknown> | undefined => {
  if (!filter?.length) return undefined;

  const conditions = filter
    .map(parseFilterString)
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .map(({ field, value, operator }) => {
      if (isJsonPath(field)) return buildJsonPathCondition(field, value, operator);
      const condition = operatorToCondition(value, operator, field, fieldTypes[field]);
      if (condition === undefined) return null;
      return buildNestedPath(field.split('.'), condition);
    })
    .filter((c): c is Record<string, unknown> => c !== null);

  return conditions.length ? { AND: conditions } : undefined;
};
