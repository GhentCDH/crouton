import type { ValueLabelColumn } from '@ghentcdh/crouton-core';

import type { SubResourceConfig } from '../../resource/SubResource.schema';

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
  childModel: unknown,
  _sub: SubResourceConfig,
): string | undefined => {
  if (!sort) return undefined;
  const fields = (childModel as { fields?: Record<string, unknown> } | null)?.fields ?? {};
  const scalarFields = new Set(Object.keys(fields));
  if (scalarFields.size === 0) return sort;
  if (sort.includes('.')) return sort;
  return scalarFields.has(sort) ? sort : undefined;
};
