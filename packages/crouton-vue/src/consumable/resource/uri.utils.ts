/**
 * Resolves a value from a nested object using a dot-separated path.
 * E.g. `getNestedValue({ parent: { id: '1' } }, 'parent.id')` returns `'1'`.
 */
const getNestedValue = (
  obj: Record<string, any>,
  path: string,
): string | undefined => {
  const value = path.split('.').reduce<any>((acc, key) => acc?.[key], obj);
  return value == null ? undefined : String(value);
};

/**
 * Replaces `{placeholder}` tokens in a URI with values from `params`.
 *
 * Supports dot-notation for nested access:
 * - `{id}`        → `params.id`
 * - `{parent.id}` → `params.parent.id`
 *
 * Unresolved placeholders are left as-is.
 */
export const replaceUriParams = (
  uri: string,
  params: Record<string, any>,
) => {
  return uri.replace(/\{([\w.]+)\}/g, (match, key: string) => {
    return getNestedValue(params, key) ?? match;
  });
};