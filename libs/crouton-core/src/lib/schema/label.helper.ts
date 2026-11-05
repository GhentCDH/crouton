/**
 * Name derivations. The most error-prone one is `clientAccessor`: the value
 * crouton puts in `resource.json.model` must equal the PrismaClient property,
 * which Prisma derives by lower-casing the first character of the model name
 * (the rest is preserved). Getting this wrong silently breaks every query.
 */

/**
 * Derive a human-readable label from an id.
 * `"field_label"` → `"Field label"`, `"fieldLabel"` → `"Field label"`.
 *
 * Kept local (mirrors `labelFromId` in `@ghentcdh/crouton-core`) so the engine
 * has no runtime dependency on core — only type-only imports, which keeps the
 * bundle lean and avoids pulling core's peer deps (zod, jsonforms) into it.
 */
export const labelFromId = (id: string): string => {
  const words = id
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → camel Case
    .replace(/[_-]+/g, ' ') // snake_case / kebab-case → spaces
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
};

type LabelObj = {
  id: string;
  label?: string;
};
export const normalizeLabel = <L extends LabelObj>(obj: L): L => {
  return { label: labelFromId(obj.id), ...obj };
};
