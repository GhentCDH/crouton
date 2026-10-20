import type { SubResourceConfig } from '../../resource/SubResource.schema';
import type { ValueLabelColumn } from '../middleware/value-label';

/**
 * Drop a trailing `.label` from a sort path when it targets a value-label column.
 */
export const sanitizeValueLabelSort = (
  sort: string | undefined,
  cols: ValueLabelColumn[] | undefined,
): string | undefined => {
  if (!sort || !cols?.length || !sort.endsWith('.label')) return sort;
  const base = sort.slice(0, -'.label'.length);
  const leaf = base.split('.').pop();
  return cols.some((c) => c.field === base || c.field === leaf) ? base : sort;
};

/**
 * Sanitize a sub-resource `orderBy` field so Prisma never rejects it.
 */
export const orderableChildSort = (
  sort: string | undefined,
  childModel: any,
  _sub: SubResourceConfig,
): string | undefined => {
  if (!sort) return undefined;
  const scalarFields = new Set(
    Object.keys((childModel?.fields ?? {}) as Record<string, unknown>),
  );
  if (scalarFields.size === 0) return sort;
  if (sort.includes('.')) return sort;
  return scalarFields.has(sort) ? sort : undefined;
};
