/**
 * Filesystem glue between the engine and a crouton project on disk:
 * reading existing resource configs, listing resources, and resolving relation
 * targets to sibling resource files.
 */


import { type LoadedConfig, resolveFromRoot } from './config';
import { clientAccessor } from './naming';
import type { JsonResourceConfig } from './types';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const fileExists = async (p: string): Promise<boolean> => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

export interface LoadedDatasource {
  name: string;
  default?: boolean;
  [key: string]: unknown;
}

/** Load datasource definitions from `dataSourcesDir` by reading `data-source.json` files. */
export const loadDatasources = async (
  loaded: LoadedConfig,
): Promise<LoadedDatasource[]> => {
  const { config, root } = loaded;
  if (!config.dataSourcesDir) return [];
  const dir = resolveFromRoot(root, config.dataSourcesDir);
  if (!(await fileExists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const result: LoadedDatasource[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const jsonPath = join(dir, e.name, 'data-source.json');
    if (!(await fileExists(jsonPath))) continue;
    const json = JSON.parse(await readFile(jsonPath, 'utf-8'));
    result.push({ name: json.name ?? e.name, ...json });
  }
  return result;
};

/** Absolute path to a resource directory. */
export const resourceDir = (loaded: LoadedConfig, name: string): string =>
  join(resolveFromRoot(loaded.root, loaded.config.resourcesDir), name);

export interface ExistingResource {
  config: JsonResourceConfig | null;
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
    ? (JSON.parse(await readFile(jsonPath, 'utf-8')) as JsonResourceConfig)
    : null;
  const hasSchemaFile =
    (await fileExists(join(dir, 'schema.ts'))) || (await fileExists(join(dir, 'schema.js')));
  return { config, hasSchemaFile };
};

/** Names of resource directories that contain a `resource.json`. */
export const listResourceNames = async (loaded: LoadedConfig): Promise<string[]> => {
  const base = resolveFromRoot(loaded.root, loaded.config.resourcesDir);
  if (!(await fileExists(base))) return [];
  const entries = await readdir(base, { withFileTypes: true });
  const names: string[] = [];
  for (const e of entries) {
    if (e.isDirectory() && (await fileExists(join(base, e.name, 'resource.json')))) {
      names.push(e.name);
    }
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
