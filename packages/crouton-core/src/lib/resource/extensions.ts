import type { ZodType } from 'zod';

import { ResourceJsonShape } from './ResourceJson.schema';

const CORE_RESOURCE_KEYS = new Set(Object.keys(ResourceJsonShape.shape));

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
