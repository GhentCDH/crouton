/** Small framework-free helpers shared by the engine stages. */

import type { JsonColumnInput, ResourceJsonInput } from '@ghentcdh/crouton-core';

import { access } from 'node:fs/promises';

/** Check whether a file exists (async). */
export const fileExists = async (p: string): Promise<boolean> => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

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
  columns: ResourceJsonInput['columns'],
): [string, Omit<JsonColumnInput, 'id'>][] => {
  if (!columns) return [];
  if (Array.isArray(columns)) {
    return columns.map(({ id, ...rest }) => [id, rest]);
  }
  return Object.entries(columns);
};

/** Build a `columns` map object from ordered entries (stable order). */
export const columnsMapFromEntries = (
  entries: [string, Omit<JsonColumnInput, 'id'>][],
): Record<string, Omit<JsonColumnInput, 'id'>> => {
  const out: Record<string, Omit<JsonColumnInput, 'id'>> = {};
  for (const [id, col] of entries) out[id] = col;
  return out;
};
