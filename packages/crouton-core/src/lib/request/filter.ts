import { SortDirEnum } from './request.model';

export const Operator = [
  'contains',
  'not_contains',
  'equals',
  'not_equals',
  'gt',
  'lt',
  'isnull',
  'isnotnull',
] as const;

export type OperatorType = (typeof Operator)[number];

/** Human-readable label shown in the filter operator dropdown. */
export const OperatorLabel: Record<OperatorType, string> = {
  contains: 'contains',
  not_contains: 'not contains',
  equals: 'equals',
  not_equals: 'not equals',
  gt: '>',
  lt: '<',
  isnull: 'is empty',
  isnotnull: 'is not empty',
};

export const OperatorOptions = Operator.map((k) => ({
  value: k,
  label: OperatorLabel[k],
}));

/** Operators that don't require a user-supplied value. */
export const OperatorNoValue = new Set<OperatorType>(['isnull', 'isnotnull']);

/** Field types used to restrict which operators are shown in the filter UI. */
export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'enum';

/** Operators available for each field type. */
export const OperatorsByType: Record<FieldType, OperatorType[]> = {
  string:  ['contains', 'not_contains', 'equals', 'not_equals', 'isnull', 'isnotnull'],
  number:  ['equals', 'not_equals', 'gt', 'lt', 'isnull', 'isnotnull'],
  date:    ['equals', 'not_equals', 'gt', 'lt', 'isnull', 'isnotnull'],
  boolean: ['equals', 'not_equals', 'isnull', 'isnotnull'],
  enum:    ['equals', 'not_equals', 'isnull', 'isnotnull'],
};

export type Filter = {
  key: string;
  value: any;
  operator: OperatorType;
  label?: string;
};

/** Parse a filter string `field:value:operator`. Returns null when no field present. */
export const parseFilterString = (
  raw: string,
): { field: string; value: string; operator: OperatorType } | null => {
  const parts = raw.split(':');
  if (parts.length < 2 || !parts[0]) return null;
  const field = parts[0];
  const lastPart = parts[parts.length - 1];
  const hasOperator = (Operator as readonly string[]).includes(lastPart);
  const value = hasOperator ? parts.slice(1, -1).join(':') : parts.slice(1).join(':');
  const operator: OperatorType = hasOperator ? (lastPart as OperatorType) : 'contains';
  return { field, value, operator };
};

const getFilterValues = (filter: string): Filter => {
  const parsed = parseFilterString(filter);
  if (!parsed) return { key: '', value: filter.split(':').slice(1).join(':'), operator: 'contains' };
  return { key: parsed.field, value: parsed.value, operator: parsed.operator };
};

const buildFilterKey = (keys: string[], filterObj: any): any => {
  if (keys.length === 1) return { key: keys[0], filterObj };
  const buildKey = keys.pop() as string;
  return buildFilterKey(keys, { [buildKey]: filterObj });
};

export const buildSort = (key: string, sortDir?: string) =>
  buildSortKey(key.split('.'), SortDirEnum.safeParse(sortDir).data ?? 'asc');

/** Build Prisma `orderBy` supporting dotted paths like `"author.origin"`. Plain names delegate to `buildSort`. */
export const buildChildSortClause = (
  sort: string,
  sortDir: string | undefined,
): Record<string, unknown> => {
  const parts = sort.split('.');
  if (parts.length === 1) return buildSort(sort, sortDir) as Record<string, unknown>;
  const dir = (sortDir ?? 'asc') as 'asc' | 'desc';
  return parts.reduceRight<Record<string, unknown>>(
    (acc, part, i) => (i === parts.length - 1 ? { [part]: dir } : { [part]: acc }),
    {},
  );
};

export const buildSortKey = (keys: string[], sortDir: any): any => {
  if (keys.length === 1) return { [keys[0]]: sortDir };
  const buildKey = keys.pop() as string;
  return buildSortKey(keys, { [buildKey]: sortDir });
};

export const buildFilter = (filters: string[]) => {
  const filter: Record<string, any> = {};
  filters?.forEach((f) => {
    const { key, value, operator } = getFilterValues(f);
    if (!key) return;
    const op = operator || 'contains';
    const filterObj: Record<string, string> = { [operator || 'contains']: value.toLowerCase() };
    if (op === 'contains') filterObj['mode'] = 'insensitive';
    const build = buildFilterKey(key.split('.'), filterObj);
    filter[build.key] = build.filterObj;
  });
  return filter;
};

export const extractFilters = (filters: string[]) => {
  const result: Filter[] = [];
  filters.forEach((f) => {
    const { key, value, operator } = getFilterValues(f);
    if (!key) return;
    result.push({ label: key, key, value, operator });
  });
  return result;
};

export const filterToString = (filter: Filter): string =>
  `${filter.key}:${filter.value}:${filter.operator}`;

export const stringToFilter = (s: string): Filter => getFilterValues(s);
