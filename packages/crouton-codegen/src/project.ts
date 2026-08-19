/**
 * Filesystem glue between the engine and a crouton project on disk:
 * reading existing resource configs, listing resources, and resolving relation
 * targets to sibling resource files.
 */

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';

import { type LoadedConfig, resolveFromRoot } from './config';
import { clientAccessor } from './naming';
import { fileExists } from './util';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Absolute path to a resource directory. */
export const resourceDir = (loaded: LoadedConfig, name: string): string =>
  join(resolveFromRoot(loaded.root, loaded.config.resourcesDir), name);

export interface ExistingResource {
  config: ResourceJsonInput | null;
  hasSchemaFile: boolean;
}

/** Read an existing `resource.json` (if any) and detect a sibling `schema.ts`. */
export const readExistingResource = async (
  loaded: LoadedConfig,
  name: string,
): Promise<ExistingResource> => {
  const dir = resourceDir(loaded, name);
  const jsonPath = join(dir, 'resource.json');
  const config = (await fileExists(jsonPath))
    ? (JSON.parse(await readFile(jsonPath, 'utf-8')) as ResourceJsonInput)
    : null;
  const hasSchemaFile =
    (await fileExists(join(dir, 'schema.ts'))) ||
    (await fileExists(join(dir, 'schema.js')));
  return { config, hasSchemaFile };
};

/** `true` when a resource.json on disk declares `kind: "custom"`. */
export const isCustomResourceFile = async (
  jsonPath: string,
): Promise<boolean> => {
  try {
    const parsed = JSON.parse(await readFile(jsonPath, 'utf-8')) as {
      kind?: string;
    };
    return parsed?.kind === 'custom';
  } catch {
    // Unreadable/malformed: let the normal pipeline report it.
    return false;
  }
};

/**
 * Names of resource directories that contain a `resource.json`.
 *
 * Custom resources are excluded: they have no Prisma model, so the
 * introspect → diff pipeline would see every column as "not found in the
 * database schema" and offer to remove it.
 */
export const listResourceNames = async (
  loaded: LoadedConfig,
): Promise<string[]> => {
  const base = resolveFromRoot(loaded.root, loaded.config.resourcesDir);
  if (!(await fileExists(base))) return [];
  const entries = await readdir(base, { withFileTypes: true });
  const names: string[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const jsonPath = join(base, e.name, 'resource.json');
    if (!(await fileExists(jsonPath))) continue;
    if (await isCustomResourceFile(jsonPath)) continue;
    names.push(e.name);
  }
  return names;
};

/**
 * Build a relation resolver: a relation's target model is "wired" when a
 * sibling resource directory exists for it. Returns the relative path used in
 * `fieldInput.resource` (`../<target>/resource.json`), else `undefined`.
 */
export const makeRelationResolver = async (
  loaded: LoadedConfig,
): Promise<(targetModel: string) => string | undefined> => {
  const known = new Set(await listResourceNames(loaded));
  return (targetModel: string) => {
    const accessor = clientAccessor(targetModel);
    return known.has(accessor) ? `../${accessor}/resource.json` : undefined;
  };
};
