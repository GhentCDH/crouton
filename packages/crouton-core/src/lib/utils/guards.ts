export type UnknownRecord = Record<string, unknown>;

export const isRecord = (v: unknown): v is UnknownRecord =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const hasKey = <K extends string>(
  obj: UnknownRecord,
  k: K,
): obj is Record<K, unknown> => k in obj;

export const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0;

export const getIn = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((cur, key) => {
    if (isRecord(cur)) return cur[key];
    return undefined;
  }, obj);

export const assertDefined = <T>(
  value: T | null | undefined,
  msg = 'Expected value to be defined',
): T => {
  if (value == null) throw new Error(msg);
  return value;
};
