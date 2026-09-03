import type { ZodType } from 'zod';

// Hardcoded to avoid a circular dep with ResourceJson.schema.ts.
// Update when a key is added to or removed from ResourceJsonShape.
const CORE_RESOURCE_KEYS = new Set([
  '$schema', 'schemaVersion', 'draft', 'kind', 'id', 'name', 'route', 'model', 'tag',
  'title', 'table', 'idType', 'database', 'parent', 'sidebar', 'display',
  'security', 'operations', 'columns', 'calculatedColumns', 'actions',
  'tableActions', 'modalSize', 'include', 'extensions',
]);

const registry = new Map<string, ZodType>();

export const registerResourceExtension = (name: string, schema: ZodType): void => {
  if (CORE_RESOURCE_KEYS.has(name))
    throw new Error(`Extension "${name}" shadows a core resource key.`);
  registry.set(name, schema);
};

export const registerResourceExtensions = (map: Record<string, ZodType> = {}): void =>
  Object.entries(map).forEach(([k, s]) => registerResourceExtension(k, s));

export const getResourceExtensions = (): ReadonlyMap<string, ZodType> => registry;

export const clearResourceExtensions = (): void => registry.clear();
