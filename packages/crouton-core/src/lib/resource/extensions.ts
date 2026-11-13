import type { ZodType } from 'zod';

// Hardcoded to avoid a circular dep with ResourceJson.schema.ts; extensions.spec
// asserts it covers every ResourceJsonShape key. Also reserves keys the
// preprocess consumes (root actions) or reports as removed.
const CORE_RESOURCE_KEYS = new Set([
  // ResourceJsonShape
  '$schema', 'schemaVersion', 'draft', 'kind', 'name', 'route', 'tag', 'openapi',
  'title', 'parent', 'sidebar', 'security', 'operations', 'columns', 'source',
  'lookup', 'layout',
  // Consumed by the preprocess, or removed with a migration hint
  'actions', 'tableActions', 'extensions', 'id', 'model', 'table', 'database',
  'idType', 'calculatedColumns', 'display', 'modalSize', 'include',
]);

const registry = new Map<string, ZodType>();
// Bumped on every registry change so schema builders can cache per registry state.
let registryStamp = 0;

export const registerResourceExtension = (name: string, schema: ZodType): void => {
  if (CORE_RESOURCE_KEYS.has(name))
    throw new Error(`Extension "${name}" shadows a core resource key.`);
  registry.set(name, schema);
  registryStamp++;
};

export const registerResourceExtensions = (map: Record<string, ZodType> = {}): void =>
  Object.entries(map).forEach(([k, s]) => registerResourceExtension(k, s));

export const getResourceExtensions = (): ReadonlyMap<string, ZodType> => registry;

export const getResourceExtensionsStamp = (): number => registryStamp;

export const clearResourceExtensions = (): void => {
  registry.clear();
  registryStamp++;
};

/** Pick only registered extension fields from an arbitrary object. */
export const pickExtensions = (obj: unknown): Record<string, unknown> => {
  if (!obj || typeof obj !== 'object') return {};
  const record = obj as Record<string, unknown>;
  return Object.fromEntries(
    [...registry.keys()]
      .filter((k) => record[k] !== undefined)
      .map((k) => [k, record[k]]),
  );
};
