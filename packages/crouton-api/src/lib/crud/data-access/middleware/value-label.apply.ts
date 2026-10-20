import { fromValueLabel, toValueLabel } from '@ghentcdh/crouton-core';

import type { ValueLabelColumn } from './valueLabel';

/**
 * Value-label envelope transforms, shared by every repository implementation.
 *
 * Lives here rather than inside `read.repository` / `write.repository` so the
 * custom-repository adapter can apply exactly the same treatment without
 * importing a repository (which would be a cycle).
 */

/** Wrap configured columns of a row as `{ value, label }`. Returns a shallow copy. */
export const applyValueLabelColumns = (
  row: any,
  cols: ValueLabelColumn[] | undefined,
): any => {
  if (!row || !cols?.length) return row;
  const out = { ...row };
  for (const { field, values } of cols) {
    if (field in out) out[field] = toValueLabel(out[field], values);
  }
  return out;
};

/** Unwrap `{ value, label }` fields back to their scalar before persistence. */
export const normalizeValueLabels = (
  data: unknown,
  cols: ValueLabelColumn[] | undefined,
): unknown => {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !cols?.length)
    return data;
  const out = { ...(data as Record<string, unknown>) };
  for (const { field } of cols) {
    if (field in out) out[field] = fromValueLabel(out[field]);
  }
  return out;
};
