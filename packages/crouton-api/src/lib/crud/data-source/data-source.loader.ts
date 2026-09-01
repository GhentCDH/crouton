import { DataSourceSchema } from '@ghentcdh/crouton-core';

import type { DataSourceEntry } from './data-source.types';
import { PrismaDataSourceAdapter } from './prisma.adapter';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Scan a directory for data-source subdirectories and load their configs + adapters.
 *
 * Each subdirectory must contain:
 * - `data-source.json` — config with `name`, `type`, and optional `default`
 * - `index.ts` (or `.js`) — default export of a PrismaClient instance
 */
export const loadDataSourcesFromDir = async (
  dirPath: string,
): Promise<DataSourceEntry[]> => {
  if (!existsSync(dirPath)) return [];

  const entries = readdirSync(dirPath, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const results: DataSourceEntry[] = [];

  for (const dir of dirs) {
    const basePath = join(dirPath, dir);
    const jsonFile = join(basePath, 'data-source.json');

    if (!existsSync(jsonFile)) continue;

    let _config: unknown;
    try {
      _config = JSON.parse(readFileSync(jsonFile, 'utf-8'));
    } catch (err) {
      resourceLoadErrorsRegistry.record({
        name: dir,
        path: jsonFile,
        error: `Invalid JSON in ${jsonFile}: ${(err as Error).message}`,
      });
      continue;
    }

    const datasource = DataSourceSchema.safeParse(_config);

    if (!datasource.success) {
      resourceLoadErrorsRegistry.record({
        name: dir,
        path: jsonFile,
        error: `Invalid datasource schema: ${jsonFile}: ${datasource.error.message}`,
      });
      continue;
    }
    const config = datasource.data;

    const indexFile = findModule(basePath, 'index');

    if (!indexFile) continue;

    let adapter;
    try {
      const mod = await import(indexFile);
      const client = mod.default;
      if (!client) continue;
      adapter = new PrismaDataSourceAdapter(client);
    } catch (err) {
      resourceLoadErrorsRegistry.record({
        name: dir,
        path: indexFile,
        error: `Failed to load datasource adapter: ${(err as Error).message}`,
      });
      continue;
    }

    results.push({ config, adapter });
  }

  return results;
};

const findModule = (dir: string, name: string): string | undefined => {
  for (const ext of ['.ts', '.js']) {
    const p = join(dir, `${name}${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
};
