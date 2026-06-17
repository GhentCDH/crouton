/**
 * Project configuration (`crouton.config.{json,js,mjs}`).
 *
 * Nothing in a crouton project links a datasource to a Prisma schema, a DB URL
 * env var, the resources directory, or the generated-types import path — these
 * are not derivable, so they live in a small project-root config that both the
 * CLI and the (future) backend endpoint read.
 */

import type { SidebarGroupConfig } from '@ghentcdh/crouton-core';

import type { Ruleset } from './types';
import { access, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';

export interface DatasourceConfig {
  /** Path to this datasource's Prisma schema, relative to the project root. */
  prismaSchema: string;
  /** Env var holding the connection URL (used by `prisma db pull`). */
  urlEnv?: string;
  /** Marks the default datasource when more than one is configured. */
  default?: boolean;
}

export interface CroutonConfig {
  /** Where resource directories live, relative to the project root. */
  resourcesDir: string;
  /** Where datasource folders live (optional; used by the scaffolder/UX). */
  dataSourcesDir?: string;
  /** Import path for generated Zod types, e.g. `@new-polities/generated/types`. */
  generatedTypesImport: string;
  /**
   * Template for a model's Zod export name. `{Model}` → Prisma model name.
   * Defaults to `{Model}WithRelationsSchema` (the relations-aware schema
   * emitted by zod-prisma-types when `createRelationValuesTypes` is on).
   */
  schemaExportName?: string;
  /** Path to the shared enum registry, relative to project root. Default `crouton.enums.json`. */
  enumsFile?: string;
  datasources: Record<string, DatasourceConfig>;
  /** Optional overrides of the default visibility ruleset. */
  rules?: Partial<Ruleset>;
  /**
   * Sidebar group definitions, keyed by group slug (e.g. `"metadata"`).
   * Resources reference a group via `sidebar.group` in their `resource.json`.
   * Centralising groups here avoids duplicated labels/positions across resource files.
   *
   * Example:
   * ```json
   * "sidebarGroups": {
   *   "metadata": { "label": "Metadata", "position": 10 }
   * }
   * ```
   */
  sidebarGroups?: Record<string, SidebarGroupConfig>;
  /**
   * Whether form fields are saved automatically as the user edits them.
   * When `true` (default) the Save button is replaced by auto-save with a
   * status indicator. Set to `false` to restore explicit Save/Cancel buttons
   * across the whole application.
   *
   * @default true
   */
  autoSave?: boolean;
}

export interface ResolvedDatasource {
  name: string;
  prismaSchema: string;
  urlEnv?: string;
}

export interface LoadedConfig {
  config: CroutonConfig;
  /** Absolute path to the config file. */
  path: string;
  /** Absolute project root (config file directory). */
  root: string;
}

const CONFIG_FILES = [
  'crouton.json',
  'crouton.config.mjs',
  'crouton.config.js',
];

const fileExists = async (p: string): Promise<boolean> => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

/** Walk up from `cwd` to find a crouton config file. */
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

/** Load + validate the config. Throws if none is found. */
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
  if (!config.generatedTypesImport) {
    throw new Error(`${path}: "generatedTypesImport" is required.`);
  }
  const names = Object.keys(config.datasources ?? {});
  if (names.length === 0)
    throw new Error(`${path}: at least one datasource is required.`);
  const defaults = names.filter((n) => config.datasources[n].default);
  if (defaults.length > 1) {
    throw new Error(`${path}: only one datasource may be marked "default".`);
  }
};

/**
 * Resolve which datasource to use:
 *  - explicit `name` → must exist
 *  - else the one marked `default`
 *  - else the only one
 *  - else ambiguous → throw (the CLI prompts before calling this)
 */
export const resolveDatasource = (
  config: CroutonConfig,
  name?: string,
): ResolvedDatasource => {
  const names = Object.keys(config.datasources);
  let chosen = name;
  if (!chosen) {
    chosen =
      names.find((n) => config.datasources[n].default) ??
      (names.length === 1 ? names[0] : undefined);
  }
  if (!chosen) {
    throw new Error(
      `Multiple datasources configured (${names.join(', ')}); specify which one to use.`,
    );
  }
  const ds = config.datasources[chosen];
  if (!ds)
    throw new Error(
      `Unknown datasource "${chosen}". Available: ${names.join(', ')}.`,
    );
  return { name: chosen, prismaSchema: ds.prismaSchema, urlEnv: ds.urlEnv };
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

/** Default prisma config path for a named datasource. */
export const defaultPrismaConfig = (name: string): string =>
  `prisma/${name}/prisma.config.ts`;

// ─── scaffolding ─────────────────────────────────────────────────────────────

export interface ScaffoldResult {
  config: CroutonConfig;
  notes: string[];
}

const firstExisting = async (
  root: string,
  candidates: string[],
): Promise<string | undefined> => {
  for (const c of candidates) {
    if (await fileExists(join(root, c))) return c;
  }
  return undefined;
};

/**
 * Best-effort `crouton.config` proposal by inspecting a project: locates the
 * Prisma schema + URL env (from `prisma.config.ts`), the data-sources folder
 * (reading each `data-source.json`), the resources dir, and the generated-types
 * import (from an existing resource `schema.ts`). Returned, not written — the
 * CLI shows it and offers to save.
 */
export const scaffoldConfigFromProject = async (
  root: string,
): Promise<ScaffoldResult> => {
  const notes: string[] = [];

  const prismaSchema =
    (await firstExisting(root, ['prisma/schema.prisma', 'schema.prisma'])) ??
    'prisma/schema.prisma';

  let urlEnv: string | undefined;
  const prismaConfig = await firstExisting(root, [
    'prisma.config.ts',
    'prisma.config.js',
    'prisma.config.mjs',
  ]);
  if (prismaConfig) {
    const text = await readFile(join(root, prismaConfig), 'utf-8');
    urlEnv = /env\(\s*["']([^"']+)["']\s*\)/.exec(text)?.[1];
  }
  if (!urlEnv)
    notes.push('Could not detect the DB URL env var; set "urlEnv" manually.');

  const dataSourcesDir = await firstExisting(root, [
    'apps/backend/src/app/data-sources',
    'src/app/data-sources',
    'data-sources',
  ]);

  const datasources: Record<string, DatasourceConfig> = {};
  if (dataSourcesDir) {
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(join(root, dataSourcesDir), {
      withFileTypes: true,
    });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const dsJsonPath = join(root, dataSourcesDir, e.name, 'data-source.json');
      if (!(await fileExists(dsJsonPath))) continue;
      const dsJson = JSON.parse(await readFile(dsJsonPath, 'utf-8')) as {
        name?: string;
        default?: boolean;
      };
      const name = dsJson.name ?? e.name;
      datasources[name] = {
        prismaSchema,
        urlEnv,
        ...(dsJson.default ? { default: true } : {}),
      };
    }
  }
  if (Object.keys(datasources).length === 0) {
    datasources['default'] = { prismaSchema, urlEnv, default: true };
    notes.push('No data-sources found; added a single "default" datasource.');
  }

  const resourcesDir =
    (dataSourcesDir ? join(dirname(dataSourcesDir), 'resources') : undefined) ??
    (await firstExisting(root, [
      'apps/backend/src/app/resources',
      'src/app/resources',
      'resources',
    ])) ??
    'src/app/resources';

  let generatedTypesImport = '';
  // Try to read an existing resource schema.ts import path.
  if (await fileExists(join(root, resourcesDir))) {
    const { readdir } = await import('node:fs/promises');
    const dirs = await readdir(join(root, resourcesDir), {
      withFileTypes: true,
    });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const schemaTs = join(root, resourcesDir, d.name, 'schema.ts');
      if (await fileExists(schemaTs)) {
        const text = await readFile(schemaTs, 'utf-8');
        const m = /from\s+["']([^"']+)["']/.exec(text);
        if (m) {
          generatedTypesImport = m[1];
          break;
        }
      }
    }
  }
  if (!generatedTypesImport) {
    generatedTypesImport = '@your-scope/generated/types';
    notes.push(
      'Could not detect the generated-types import; set "generatedTypesImport" manually.',
    );
  }

  return {
    config: {
      resourcesDir,
      dataSourcesDir,
      generatedTypesImport,
      schemaExportName: '{Model}Schema',
      datasources,
    },
    notes,
  };
};
