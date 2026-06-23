/** Traverse a dotted path on an object (e.g. `"author.name"` → `obj.author.name`). */
const resolvePath = (obj: any, path: string): any =>
  path.split('.').reduce((o: any, k: string) => o?.[k], obj);

/**
 * Resolve a `displayKey` (string or string[]) from a single object.
 * - String: simple dotted-path lookup.
 * - Array: resolve each key, filter nullish/empty, join with `separator`.
 */
const resolveDisplayKey = (
  obj: any,
  keyOrKeys: string | string[],
  separator: string,
): string | null => {
  if (Array.isArray(keyOrKeys)) {
    const parts = keyOrKeys
      .map((k) => resolvePath(obj, k))
      .filter((v) => v != null && v !== '');
    return parts.length ? parts.join(separator) : null;
  }
  return resolvePath(obj, keyOrKeys) ?? null;
};

export const useDisplayValue = (value: any, formValues: any, opts: any) => {
  const raw = value;
  const separator: string = opts.separator ?? ' ';
  const listSeparator: string = opts.listSeparator ?? ', ';

  if (typeof raw !== 'object') {
    return raw ?? null;
  }

  if (opts.dataPath) {
    // Traverse the dotted dataPath in formValues (e.g. "bibliography" → formValues.bibliography)
    const nested = opts.dataPath
      .split('.')
      .reduce((o: any, k: string) => o?.[k], formValues);
    if (opts.keys && nested && typeof nested === 'object')
      return resolveDisplayKey(nested, opts.keys, separator);
    if (opts.key && nested && typeof nested === 'object')
      return (nested as any)[opts.key] ?? null;
    return nested ?? null;
  }

  // Array value (multi-value relation): map each item, join with listSeparator.
  if (Array.isArray(raw)) {
    const keyOrKeys = opts.keys ?? opts.key;
    if (!keyOrKeys) return raw ?? null;
    const parts = (raw as any[])
      .map((item) => resolveDisplayKey(item, keyOrKeys, separator))
      .filter((v) => v != null && v !== '');
    return parts.length ? parts.join(listSeparator) : null;
  }

  if (raw !== null && typeof raw === 'object') {
    if (opts.keys) return resolveDisplayKey(raw, opts.keys, separator);
    if (opts.key) return (raw as any)[opts.key] ?? null;
  }
  return raw ?? null;
};
