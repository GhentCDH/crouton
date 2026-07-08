/**
 * Project configuration.
 *
 * `crouton.json` (project root) holds only project-wide settings — paths, the
 * schema export-name template, the enum registry, sidebar groups, ruleset
 * overrides. Datasources are NOT listed here: each is self-describing in its own
 * `<dataSourcesDir>/<name>/data-source.json` and discovered by scanning that
 * directory. Every datasource carries its own Prisma schema, generated zod
 * import, zod output, and Prisma config (for multi-datasource projects).
 */

import {
  CONFIG_FILES,
  type CroutonConfig,
  type DataSource,
  DataSourceSchema,
} from '@ghentcdh/crouton-core';

import { fileExists } from './util';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';


export interface LoadedConfig {
  config: CroutonConfig;
  /** Absolute path to `crouton.json`. */
  path: string;
  /** Absolute project root (config file directory). */
  root: string;
}

/** Walk up from `cwd` to find `crouton.json`. */
export const findConfigPath = async (
  cwd: string,
): Promise<string | undefined> => {
  let dir = resolve(cwd);

  while (true) {
    for (const name of CONFIG_FILES) {
      const candidate = join(dir, name);
      if (await fileExists(candidate)) return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
};

/** Load + validate `crouton.json`. Throws if none is found. */
export const loadConfig = async (cwd: string): Promise<LoadedConfig> => {
  const path = await findConfigPath(cwd);
  if (!path) {
    throw new Error(
      `No crouton config found (looked for ${CONFIG_FILES.join(', ')} up from ${cwd}).`,
    );
  }
  let config: CroutonConfig;
  if (path.endsWith('.json')) {
    config = JSON.parse(await readFile(path, 'utf-8')) as CroutonConfig;
  } else {
    const mod = (await import(path)) as {
      default?: CroutonConfig;
    } & CroutonConfig;
    config = mod.default ?? mod;
  }
  validateConfig(config, path);
  return { config, path, root: dirname(path) };
};

export const validateConfig = (
  config: CroutonConfig,
  path = '<config>',
): void => {
  if (!config.resourcesDir)
    throw new Error(`${path}: "resourcesDir" is required.`);
  if (!config.dataSourcesDir)
    throw new Error(`${path}: "dataSourcesDir" is required.`);
};

/** Default Prisma config path for a datasource: `prisma/<name>/prisma.config.ts`. */
export const defaultPrismaConfig = (name: string): string =>
  `prisma/${name}/prisma.config.ts`;

/**
 * Discover datasources by scanning `dataSourcesDir`: each subdirectory with a
 * `data-source.json` becomes a `ResolvedDatasource`. The datasource `name`
 * defaults to the folder name; `prismaConfig` defaults to `prisma/<name>/prisma.config.ts`.
 */
export const loadDatasources = async (
  loaded: LoadedConfig,
): Promise<DataSource[]> => {
  const base = resolveFromRoot(loaded.root, loaded.config.dataSourcesDir);
  if (!(await fileExists(base))) return [];
  const entries = await readdir(base, { withFileTypes: true });
  const datasources: DataSource[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const jsonPath = join(base, e.name, 'data-source.json');
    if (!(await fileExists(jsonPath))) continue;
    const ds_json = JSON.parse(await readFile(jsonPath, 'utf-8'));
    const name = ds_json.name ?? e.name;
    if (!ds_json.prismaSchema || !ds_json.generatedTypesImport) {
      const missing = [
        !ds_json.prismaSchema && '"prismaSchema"',
        !ds_json.generatedTypesImport && '"generatedTypesImport"',
      ]
        .filter(Boolean)
        .join(' and ');
      throw new Error(
        `${jsonPath}: datasource "${name}" is missing ${missing}. ` +
          'A v2 data-source.json must be self-describing — add prismaSchema, urlEnv, ' +
          'generatedTypesImport, zodOutput and prismaConfig (see `crouton create-datasource`).',
      );
    }
    datasources.push(
      DataSourceSchema.parse({
        ...ds_json,
        name,
        prismaConfig: ds_json.prismaConfig ?? defaultPrismaConfig(name),
      }),
    );
  }
  validateDatasources(datasources);
  return datasources;
};

export const validateDatasources = (datasources: DataSource[]): void => {
  if (datasources.length === 0) {
    throw new Error(
      'No datasources found (no data-source.json under the data-sources dir).',
    );
  }
  const defaults = datasources.filter((d) => d.default);
  if (defaults.length > 1) {
    throw new Error(
      `Only one datasource may be marked "default" (found: ${defaults.map((d) => d.name).join(', ')}).`,
    );
  }
};

/**
 * Resolve which discovered datasource to use:
 *  - explicit `name` → must exist
 *  - else the one marked `default`
 *  - else the only one
 *  - else ambiguous → throw (the CLI prompts before calling this)
 */
export const resolveDatasource = (
  datasources: DataSource[],
  name?: string,
): DataSource => {
  if (name) {
    const found = datasources.find((d) => d.name === name);
    if (!found) {
      throw new Error(
        `Unknown datasource "${name}". Available: ${datasources.map((d) => d.name).join(', ')}.`,
      );
    }
    return found;
  }
  const def = datasources.find((d) => d.default);
  if (def) return def;
  if (datasources.length === 1) return datasources[0];
  throw new Error(
    `Multiple datasources found (${datasources.map((d) => d.name).join(', ')}); specify which one to use.`,
  );
};

/** Build the `(prismaName) → exportName` function from the config template. */
export const makeSchemaExportName = (
  config: CroutonConfig,
): ((prismaName: string) => string) => {
  const template = config.schemaExportName ?? '{Model}WithRelationsSchema';
  return (prismaName: string) => template.replace('{Model}', prismaName);
};

/** Resolve a config path (possibly relative) against the project root. */
export const resolveFromRoot = (root: string, p: string): string =>
  isAbsolute(p) ? p : join(root, p);
