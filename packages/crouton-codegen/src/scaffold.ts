/**
 * Scaffolding: best-effort project proposal for a new-style crouton project.
 *
 * Scans an existing project for Prisma configs, datasource folders, and
 * resource directories and returns a proposed `crouton.json` + per-datasource
 * `data-source.json`. Returned, not written — the CLI shows it and offers to save.
 */

import { z } from 'zod';

import {
  type CroutonConfig,
  CroutonConfigSchema,
  type DataSource,
  DataSourceShape,
  transformDataSource,
} from '@ghentcdh/crouton-core';

import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { fileExists } from './util';

export const ScallfoldDatasourceSchema = DataSourceShape.extend({
  /** Folder name under `dataSourcesDir`. */ folder: z
    .string()
    .default('default'),
}).transform(transformDataSource);

export type ScaffoldDatasource = z.infer<typeof ScallfoldDatasourceSchema>;

export interface ScaffoldResult {
  config: CroutonConfig;
  /** Proposed `data-source.json` per discovered datasource folder. */
  datasources: ScaffoldDatasource[];
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
 * Best-effort proposal for a new-style project: a `crouton.json` (paths only)
 * plus a self-describing `data-source.json` per discovered datasource folder.
 * Returned, not written — the CLI shows it and offers to save.
 */
export const scaffoldConfigFromProject = async (
  root: string,
): Promise<ScaffoldResult> => {
  const notes: string[] = [];

  let urlEnv: string | undefined;
  const prismaConfigFile = await firstExisting(root, [
    'prisma.config.ts',
    'prisma.config.js',
    'prisma.config.mjs',
  ]);
  if (prismaConfigFile) {
    const text = await readFile(join(root, prismaConfigFile), 'utf-8');
    urlEnv = /env\(\s*["']([^"']+)["']\s*\)/.exec(text)?.[1];
  }
  if (!urlEnv)
    notes.push(
      'Could not detect a DB URL env var; set "urlEnv" per datasource manually.',
    );

  const dataSourcesDir =
    (await firstExisting(root, [
      'apps/backend/src/app/data-sources',
      'src/app/data-sources',
      'data-sources',
    ])) ?? 'src/app/data-sources';

  const resourcesDir =
    (await firstExisting(root, [
      'apps/backend/src/app/resources',
      'src/app/resources',
      'resources',
    ])) ?? join(dirname(dataSourcesDir), 'resources');

  // Detect a generated-types import from an existing resource schema.ts.
  let detectedImport: string | undefined;
  if (await fileExists(join(root, resourcesDir))) {
    const dirs = await readdir(join(root, resourcesDir), {
      withFileTypes: true,
    });
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const schemaTs = join(root, resourcesDir, d.name, 'schema.ts');
      if (await fileExists(schemaTs)) {
        const m = /from\s+["']([^"']+)["']/.exec(
          await readFile(schemaTs, 'utf-8'),
        );
        if (m) {
          detectedImport = m[1];
          break;
        }
      }
    }
  }

  const datasources: ScaffoldDatasource[] = [];
  if (await fileExists(join(root, dataSourcesDir))) {
    const entries = await readdir(join(root, dataSourcesDir), {
      withFileTypes: true,
    });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const existing = join(root, dataSourcesDir, e.name, 'data-source.json');
      const prev: Partial<DataSource> = (await fileExists(existing))
        ? JSON.parse(await readFile(existing, 'utf-8'))
        : {};
      const name = prev.name ?? e.name;
      datasources.push(
        ScallfoldDatasourceSchema.parse({
          folder: e.name,
          type: prev.type,
          name,
          default: prev.default,
          prismaSchema: prev.prismaSchema,
          urlEnv: prev.urlEnv ?? urlEnv ?? '',
          generatedTypesImport: prev.generatedTypesImport ?? detectedImport,
          zodOutput: prev.zodOutput,
          prismaConfig: prev.prismaConfig,
        }),
      );
    }
  }
  if (datasources.length === 0) {
    datasources.push(
      ScallfoldDatasourceSchema.parse({
        name: 'default',
        default: true,
        urlEnv,
        generatedTypesImport: detectedImport ?? '@your-scope/generated/default',
      }),
    );
    notes.push(
      'No data-sources found; proposed a single "default" datasource.',
    );
  } else if (!datasources.some((d) => d.default)) {
    datasources[0].default = true;
  }

  return {
    config: CroutonConfigSchema.parse({
      title: 'Crouton',
      resourcesDir,
      dataSourcesDir,
    }),
    datasources,
    notes,
  };
};