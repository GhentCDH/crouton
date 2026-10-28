export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const hasKey = <K extends string>(
  obj: Record<string, unknown>,
  k: K,
): obj is Record<K, unknown> => k in obj;

export const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0;
