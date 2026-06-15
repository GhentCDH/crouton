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
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
};

/**
 * PrismaClient accessor for a model name.
 * `Language` → `language`, `InternalAuthor` → `internalAuthor`,
 * `metadata_config` → `metadata_config` (first char already lower-case).
 */
export const clientAccessor = (prismaModelName: string): string => {
  if (!prismaModelName) return prismaModelName;
  return prismaModelName.charAt(0).toLowerCase() + prismaModelName.slice(1);
};

export interface ResourceNames {
  /** Directory + route + resource `name`. */
  name: string;
  route: string;
  /** resource.json `model` (PrismaClient accessor). */
  model: string;
  tag: string;
  title: string;
}

/**
 * Derive the resource identity fields from a Prisma model name.
 * Mirrors the `new_polities` convention: `name`/`route`/`model` are the client
 * accessor; `tag` is the Prisma model name; `title` is a humanized label.
 */
export const resourceNames = (prismaModelName: string): ResourceNames => {
  const accessor = clientAccessor(prismaModelName);
  return {
    name: accessor,
    route: accessor,
    model: accessor,
    tag: prismaModelName,
    title: labelFromId(accessor),
  };
};

const TIMESTAMP_NAME = /^(created|updated|inserted|modified|deleted)_?at$|^(created|updated)$/i;

/** Heuristic: is this field a created/updated style timestamp? */
export const isTimestampField = (opts: {
  name: string;
  type: string;
  isUpdatedAt: boolean;
}): boolean => {
  if (opts.type !== 'DateTime') return false;
  if (opts.isUpdatedAt) return true;
  return TIMESTAMP_NAME.test(opts.name);
};

/** Map a Prisma scalar/enum type to a `fieldInput.type` control hint. */
export const fieldInputType = (prismaType: string, isEnum: boolean): string => {
  if (isEnum) return 'select';
  switch (prismaType) {
    case 'Boolean':
      return 'boolean';
    case 'Int':
    case 'BigInt':
    case 'Float':
    case 'Decimal':
      return 'number';
    case 'DateTime':
      return 'date';
    case 'Json':
      return 'json';
    case 'String':
    default:
      return 'text';
  }
};

/**
 * Control type for a scalar column, taking the field name into account.
 * `description`-style string fields default to a `textarea`.
 */
export const scalarFieldInputType = (name: string, prismaType: string): string => {
  if (prismaType === 'String' && /description/i.test(name)) return 'textarea';
  return fieldInputType(prismaType, false);
};

/** Infer the resource `idType` from the primary-key Prisma type. */
export const idTypeFor = (prismaType: string | undefined): 'string' | 'number' => {
  if (prismaType === 'Int' || prismaType === 'BigInt') return 'number';
  return 'string';
};
