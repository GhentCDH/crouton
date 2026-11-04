/**
 * Filesystem glue between the engine and a crouton project on disk:
 * reading existing resource configs, listing resources, and resolving relation
 * targets to sibling resource files.
 */

import {
  type ResourceJson,
  type ResourceJsonInput,
  buildResourceJsonSchema,
} from '@ghentcdh/crouton-core';

import { type LoadedConfig, findConfigPath, loadConfig, resolveFromRoot } from './config';
import { clientAccessor } from './naming';
import { fileExists } from './util';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Absolute path to the resource directory root. */
const resourceBase = (loaded: LoadedConfig): string =>
  resolveFromRoot(loaded.root, loaded.config.resourcesDir);

/** Absolute path to a resource directory. */
const resourceDir = (loaded: LoadedConfig, name: string): string =>
  join(resourceBase(loaded), name);

/**
 * Discover `resources/<name>/resource.json` files from the project's
 * crouton config. Returns an empty list when there is no config or directory.
 */
export const discoverResourceEntries = async (
  cwd: string,
): Promise<{ name: string; path: string }[]> => {
  const configPath = await findConfigPath(cwd);
  if (!configPath) return [];
  const loaded = await loadConfig(cwd);
  const base = resourceBase(loaded);
  let entries: { isDirectory(): boolean; name: string }[];
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, path: join(base, e.name, 'resource.json') }));
};

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

/** Resource directories that contain a `resource.json` (custom included). */
const listResourceDirs = async (loaded: LoadedConfig): Promise<string[]> => {
  const base = resourceBase(loaded);
  if (!(await fileExists(base))) return [];
  const entries = await readdir(base, { withFileTypes: true });
  const names: string[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!(await fileExists(join(base, e.name, 'resource.json')))) continue;
    names.push(e.name);
  }
  return names;
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
  const base = resourceBase(loaded);
  const names: string[] = [];
  for (const name of await listResourceDirs(loaded)) {
    if (await isCustomResourceFile(join(base, name, 'resource.json'))) continue;
    names.push(name);
  }
  return names;
};

/**
 * Read and parse all `resource.json` files (including custom resources).
 * Invalid files are silently skipped.
 */
export const readAllResourceJsons = async (
  loaded: LoadedConfig,
): Promise<ResourceJson[]> => {
  const names = await listResourceDirs(loaded);
  const base = resolveFromRoot(loaded.root, loaded.config.resourcesDir);
  const results: ResourceJson[] = [];
  for (const name of names) {
    try {
      const raw: unknown = JSON.parse(
        await readFile(join(base, name, 'resource.json'), 'utf-8'),
      );
      const parsed = buildResourceJsonSchema().safeParse(raw);
      if (parsed.success) results.push(parsed.data);
    } catch {
      /* skip unreadable */
    }
  }
  return results;
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
