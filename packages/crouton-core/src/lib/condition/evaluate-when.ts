import type { WhenCondition } from '../layout/schema/LayoutItem.schema';

/**
 * Evaluate a WhenCondition against a flat values map.
 * `field` is resolved from the values object by key.
 * `exists` checks v != null && v !== '' — works for string, number, boolean ids.
 */
export const evaluateWhen = (
  cond: WhenCondition,
  values: Record<string, unknown>,
): boolean => {
  const v = values[cond.field];
  if (cond.exists !== undefined) {
    const nonEmpty = v != null && v !== '';
    return cond.exists ? nonEmpty : !nonEmpty;
  }
  if (cond.notExists !== undefined) {
    const empty = v == null || v === '';
    return cond.notExists ? empty : !empty;
  }
  if (cond.neq !== undefined) return v !== cond.neq;
  return v === cond.eq;
};

