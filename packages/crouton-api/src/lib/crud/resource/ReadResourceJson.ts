import { dirname, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { ResourceJson, ResourceJsonSchema } from '@ghentcdh/crouton-core';

export type ResolveResource = { json: ResourceJson; dir: string };

export const readResourceJson = (jsonPath: string): ResolveResource => {
  if (!existsSync(jsonPath)) return undefined;
  const fileContent = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  const resource = ResourceJsonSchema.safeParse(fileContent);

  if (resource.error) {
    console.error(resource.error);

    throw new Error(`Resource cannot be parsed ${jsonPath}`);
  }

  return {
    json: resource.data,
    dir: dirname(jsonPath),
  };
};

export const readResourceJsonFromPath = (resourcePath: string) => {
  if (resourcePath.endsWith('.json')) {
    return readResourceJson(resourcePath);
  }

  const jsonPath = resolve(dirname(resourcePath), 'resource.json');

  return readResourceJson(jsonPath);
};
