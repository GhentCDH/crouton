import { type ResourceJson, ResourceJsonSchema } from '@ghentcdh/crouton-core';

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type ResolveResource = { json: ResourceJson; dir: string };

export type ReadResourceJsonResult =
  | { success: true; data: ResolveResource }
  | { success: false; error: string };

export const readResourceJson = (jsonPath: string): ReadResourceJsonResult | undefined => {
  if (!existsSync(jsonPath)) return undefined;

  let fileContent: unknown;
  try {
    fileContent = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  } catch (err) {
    return {
      success: false,
      error: `Invalid JSON in ${jsonPath}: ${(err as Error).message}`,
    };
  }

  const resource = ResourceJsonSchema.safeParse(fileContent);
  if (resource.error) {
    return {
      success: false,
      error: `Resource cannot be parsed ${jsonPath}: ${resource.error.message}`,
    };
  }

  return {
    success: true,
    data: {
      json: resource.data,
      dir: dirname(jsonPath),
    },
  };
};

export const readResourceJsonFromPath = (resourcePath: string) => {
  if (resourcePath.endsWith('.json')) {
    return readResourceJson(resourcePath);
  }

  const jsonPath = resolve(dirname(resourcePath), 'resource.json');

  return readResourceJson(jsonPath);
};