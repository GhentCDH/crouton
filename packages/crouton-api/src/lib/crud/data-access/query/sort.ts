import type { SubResourceConfig } from '../../resource/SubResource.schema';

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
