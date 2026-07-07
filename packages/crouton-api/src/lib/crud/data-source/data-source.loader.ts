import { DataSourceSchema } from '@ghentcdh/crouton-core';

import type { DataSourceEntry } from './data-source.types';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Scan a directory for data-source subdirectories and load their configs + clients.
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

    const _config = JSON.parse(readFileSync(jsonFile, 'utf-8'));
    const datasource = DataSourceSchema.safeParse(_config);

    if (!datasource.success) {
      console.error(datasource.error);
      throw new Error(`Invalid datasource schema: ${jsonFile}`);
    }
    const config = datasource.data;

    const indexFile = findModule(basePath, 'index');

    if (!indexFile) continue;

    const mod = await import(indexFile);
    const client = mod.default;
    if (!client) continue;

    results.push({ config, client });
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
