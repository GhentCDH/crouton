import {
  type OperatorType,
  parseFilterString,
} from '@ghentcdh/crouton-core';

export { parseFilterString };

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

const operatorToCondition = (value: string, operator: OperatorType): unknown => {
  const num = Number(value);
  const numVal = Number.isNaN(num) ? value : num;
  switch (operator) {
    case 'contains': return { contains: value };
    case 'not_contains': return { not: { contains: value } };
    case 'equals': return { equals: value };
    case 'not_equals': return { not: value };
    case 'gt': return { gt: numVal };
    case 'lt': return { lt: numVal };
    case 'isnull': return null;
    case 'isnotnull': return { not: null };
    default: return undefined;
  }
};

/**
 * Build a Prisma `where` clause from an array of filter strings.
 * Returns `undefined` (no filter) when the array is empty or all entries are unparseable.
 */
export const buildFilterWhere = (
  filter: string[] | undefined,
): Record<string, unknown> | undefined => {
  if (!filter?.length) return undefined;

  const conditions = filter
    .map(parseFilterString)
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .map(({ field, value, operator }) =>
      isJsonPath(field)
        ? buildJsonPathCondition(field, value, operator)
        : buildNestedPath(field.split('.'), operatorToCondition(value, operator)),
    )
    .filter((c): c is Record<string, unknown> => c !== null);

  return conditions.length ? { AND: conditions } : undefined;
};
