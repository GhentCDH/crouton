/**
 * Project configuration.
 *
 * `crouton.json` (project root) holds only project-wide settings — paths, the
 * schema export-name template, the enum registry, ruleset overrides. Datasources
 * are NOT listed here: each is self-describing in its own
 * `<dataSourcesDir>/<name>/data-source.json` and discovered by scanning that
 * directory. Every datasource carries its own Prisma schema, generated zod
 * import, zod output, and Prisma config (for multi-datasource projects).
 */

import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import type { Ruleset } from './types';

/**
 * Shape of a `data-source.json`. The `type`/`name`/`default` keys are also read
 * by crouton-api at runtime; the rest are codegen-only.
 */
export interface DatasourceConfig {
  type?: string;
  /** Datasource name (defaults to the folder name). */
  name?: string;
  /** Marks the default datasource when more than one exists. */
  default?: boolean;
  /** Path to this datasource's Prisma schema, relative to the project root. */
  prismaSchema: string;
  /** Env var holding the connection URL. */
  urlEnv?: string;
  /** Import path for this datasource's generated Zod types (for `schema.ts`). */
  generatedTypesImport: string;
  /** This datasource's zod-prisma-types output dir, relative to project root. */
  zodOutput?: string;
  /** Prisma config file for this datasource. Default `prisma/<name>/prisma.config.ts`. */
  prismaConfig?: string;
}

export interface CroutonConfig {
  /** Where resource directories live, relative to the project root. */
  resourcesDir: string;
  /** Where datasource folders live (each with a `data-source.json`). */
  dataSourcesDir: string;
  /**
   * Template for a model's Zod export name. `{Model}` → Prisma model name.
   * Defaults to `{Model}WithRelationsSchema` (the relations-aware schema
   * emitted by zod-prisma-types when `createRelationValuesTypes` is on).
   */
  schemaExportName?: string;
  /** Path to the shared enum registry, relative to project root. Default `crouton.enums.json`. */
  enumsFile?: string;
  /** Optional overrides of the default visibility ruleset. */
  rules?: Partial<Ruleset>;
}

/** A fully-resolved datasource (from `data-source.json` + defaults). */
export interface ResolvedDatasource {
  name: string;
  default: boolean;
  prismaSchema: string;
  urlEnv?: string;
  generatedTypesImport: string;
  zodOutput?: string;
  /** Prisma config file path, relative to project root. */
  prismaConfig: string;
}

export interface LoadedConfig {
  config: CroutonConfig;
  /** Absolute path to `crouton.json`. */
  path: string;
  /** Absolute project root (config file directory). */
  root: string;
}

const CONFIG_FILES = ['crouton.json', 'crouton.mjs', 'crouton.js'];

const fileExists = async (p: string): Promise<boolean> => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

/** Walk up from `cwd` to find `crouton.json`. */
export const findConfigPath = async (cwd: string): Promise<string | undefined> => {
  let dir = resolve(cwd);
  // eslint-disable-next-line no-constant-condition
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
    const mod = (await import(path)) as { default?: CroutonConfig } & CroutonConfig;
    config = mod.default ?? mod;
  }
  validateConfig(config, path);
  return { config, path, root: dirname(path) };
};

export const validateConfig = (config: CroutonConfig, path = '<config>'): void => {
  if (!config.resourcesDir) throw new Error(`${path}: "resourcesDir" is required.`);
  if (!config.dataSourcesDir) throw new Error(`${path}: "dataSourcesDir" is required.`);
};

/** Default Prisma config path for a datasource: `prisma/<name>/prisma.config.ts`. */
export const defaultPrismaConfig = (name: string): string => `prisma/${name}/prisma.config.ts`;

/**
 * Discover datasources by scanning `dataSourcesDir`: each subdirectory with a
 * `data-source.json` becomes a `ResolvedDatasource`. The datasource `name`
 * defaults to the folder name; `prismaConfig` defaults to `prisma/<name>/prisma.config.ts`.
 */
export const loadDatasources = async (loaded: LoadedConfig): Promise<ResolvedDatasource[]> => {
  const base = resolveFromRoot(loaded.root, loaded.config.dataSourcesDir);
  if (!(await fileExists(base))) return [];
  const entries = await readdir(base, { withFileTypes: true });
  const datasources: ResolvedDatasource[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const jsonPath = join(base, e.name, 'data-source.json');
    if (!(await fileExists(jsonPath))) continue;
    const ds = JSON.parse(await readFile(jsonPath, 'utf-8')) as DatasourceConfig;
    const name = ds.name ?? e.name;
    datasources.push({
      name,
      default: ds.default === true,
      prismaSchema: ds.prismaSchema,
      urlEnv: ds.urlEnv,
      generatedTypesImport: ds.generatedTypesImport,
      zodOutput: ds.zodOutput,
      prismaConfig: ds.prismaConfig ?? defaultPrismaConfig(name),
    });
  }
  validateDatasources(datasources);
  return datasources;
};

export const validateDatasources = (datasources: ResolvedDatasource[]): void => {
  if (datasources.length === 0) {
    throw new Error('No datasources found (no data-source.json under the data-sources dir).');
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
  datasources: ResolvedDatasource[],
  name?: string,
): ResolvedDatasource => {
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
export const makeSchemaExportName = (config: CroutonConfig): ((prismaName: string) => string) => {
  const template = config.schemaExportName ?? '{Model}WithRelationsSchema';
  return (prismaName: string) => template.replace('{Model}', prismaName);
};

/** Resolve a config path (possibly relative) against the project root. */
export const resolveFromRoot = (root: string, p: string): string =>
  isAbsolute(p) ? p : join(root, p);

// ─── scaffolding ─────────────────────────────────────────────────────────────

export interface ScaffoldDatasource extends DatasourceConfig {
  /** Folder name under `dataSourcesDir`. */
  folder: string;
}

export interface ScaffoldResult {
  config: CroutonConfig;
  /** Proposed `data-source.json` per discovered datasource folder. */
  datasources: ScaffoldDatasource[];
  notes: string[];
}

const firstExisting = async (root: string, candidates: string[]): Promise<string | undefined> => {
  for (const c of candidates) {
    if (await fileExists(join(root, c))) return c;
  }
  return undefined;
};

/**
 * Best-effort proposal for a new-style project: a `crouton.json` (paths only)
 * plus a self-describing `data-source.json` per discovered datasource folder.
 * Returned, not written — the CLI shows it and offers to save.
 */
export const scaffoldConfigFromProject = async (root: string): Promise<ScaffoldResult> => {
  const notes: string[] = [];

  let urlEnv: string | undefined;
  const prismaConfigFile = await firstExisting(root, ['prisma.config.ts', 'prisma.config.js', 'prisma.config.mjs']);
  if (prismaConfigFile) {
    const text = await readFile(join(root, prismaConfigFile), 'utf-8');
    urlEnv = /env\(\s*["']([^"']+)["']\s*\)/.exec(text)?.[1];
  }
  if (!urlEnv) notes.push('Could not detect a DB URL env var; set "urlEnv" per datasource manually.');

  const dataSourcesDir =
    (await firstExisting(root, [
      'apps/backend/src/app/data-sources',
      'src/app/data-sources',
      'data-sources',
    ])) ?? 'src/app/data-sources';

  const resourcesDir =
    (await firstExisting(root, ['apps/backend/src/app/resources', 'src/app/resources', 'resources'])) ??
    join(dirname(dataSourcesDir), 'resources');

  // Detect a generated-types import from an existing resource schema.ts.
  let detectedImport: string | undefined;
  if (await fileExists(join(root, resourcesDir))) {
    const dirs = await readdir(join(root, resourcesDir), { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const schemaTs = join(root, resourcesDir, d.name, 'schema.ts');
      if (await fileExists(schemaTs)) {
        const m = /from\s+["']([^"']+)["']/.exec(await readFile(schemaTs, 'utf-8'));
        if (m) {
          detectedImport = m[1];
          break;
        }
      }
    }
  }

  const datasources: ScaffoldDatasource[] = [];
  if (await fileExists(join(root, dataSourcesDir))) {
    const entries = await readdir(join(root, dataSourcesDir), { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const existing = join(root, dataSourcesDir, e.name, 'data-source.json');
      const prev: Partial<DatasourceConfig> = (await fileExists(existing))
        ? (JSON.parse(await readFile(existing, 'utf-8')) as DatasourceConfig)
        : {};
      const name = prev.name ?? e.name;
      datasources.push({
        folder: e.name,
        type: prev.type ?? 'postgres',
        name,
        ...(prev.default ? { default: true } : {}),
        prismaSchema: prev.prismaSchema ?? `prisma/${name}/schema.prisma`,
        urlEnv: prev.urlEnv ?? urlEnv,
        generatedTypesImport: prev.generatedTypesImport ?? detectedImport ?? `@your-scope/generated/${name}`,
        zodOutput: prev.zodOutput ?? `generated/${name}/src`,
        prismaConfig: prev.prismaConfig ?? defaultPrismaConfig(name),
      });
    }
  }
  if (datasources.length === 0) {
    datasources.push({
      folder: 'default',
      type: 'postgres',
      name: 'default',
      default: true,
      prismaSchema: 'prisma/default/schema.prisma',
      urlEnv,
      generatedTypesImport: detectedImport ?? '@your-scope/generated/default',
      zodOutput: 'generated/default/src',
      prismaConfig: defaultPrismaConfig('default'),
    });
    notes.push('No data-sources found; proposed a single "default" datasource.');
  } else if (!datasources.some((d) => d.default)) {
    datasources[0].default = true;
  }

  return {
    config: {
      resourcesDir,
      dataSourcesDir,
      schemaExportName: '{Model}WithRelationsSchema',
      enumsFile: 'crouton.enums.json',
    },
    datasources,
    notes,
  };
};
