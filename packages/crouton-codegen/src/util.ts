/** Small framework-free helpers shared by the engine stages. */

import type { JsonColumn, ResourceJson } from './types';

/** Deep clone that preserves object key insertion order (JSON-safe configs). */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Order-insensitive structural equality (sorts object keys before compare). */
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object') {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const ak = Object.keys(ao).sort();
    const bk = Object.keys(bo).sort();
    if (ak.length !== bk.length || ak.some((k, i) => k !== bk[i])) return false;
    return ak.every((k) => deepEqual(ao[k], bo[k]));
  }
  return false;
};

/**
 * Normalize a `columns` value (array | map | undefined) into ordered
 * `[id, columnWithoutId][]` entries. Preserves declaration order.
 */
export const columnEntries = (
  columns: ResourceJson['columns'],
): [string, Omit<JsonColumn, 'id'>][] => {
  if (!columns) return [];
  if (Array.isArray(columns)) {
    return columns.map(({ id, ...rest }) => [id, rest]);
  }
  return Object.entries(columns);
};

/** Build a `columns` map object from ordered entries (stable order). */
export const columnsMapFromEntries = (
  entries: [string, Omit<JsonColumn, 'id'>][],
): Record<string, Omit<JsonColumn, 'id'>> => {
  const out: Record<string, Omit<JsonColumn, 'id'>> = {};
  for (const [id, col] of entries) out[id] = col;
  return out;
};
