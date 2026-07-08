/**
 * Filesystem-driven resource loader.
 *
 * Two sources feed the resource registry:
 *
 *   1. `<dir>/<name>/resource.json` — declarative configuration
 *      (route / operations / columns / …).
 *
 *   2. `<dir>/<name>/resource.ts` — imperative configuration as a
 *      plain `ResourceConfig` default export.
 *
 * When both exist for the same name, the JSON wins.
 *
 * The JSON only carries operation toggles; actual Zod schemas come from
 * a sibling `schema.ts` (default export). If the JSON lists `columns`,
 * the loader narrows the Zod schema down to those column ids via
 * `.pick()` before attaching it to every enabled operation.
 *
 * `resource.ts` / `hooks.ts` / `schema.ts` do **not** import from each
 * other — this loader is the only place that stitches them together.
 */

import type { ZodObject, ZodRawShape } from 'zod';

import { loadActions } from '../action';
import { fromJson } from '../adapter';
import { loadEnumRegistry } from '../enum-registry';
import { findModule, importDefault } from './module.loader';
import { loadResourceHooks, loadSubResourceHooks } from '../hooks';
import { readResourceJson } from '../resource/ReadResourceJson';
import { type Resource } from '../resource/ResourceConfig.schema';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const loadResourceConfigsFromDir = async (
  dirPath: string,
  baseUrl?: string,
  enumsFile?: string,
): Promise<Resource[]> => {
  const enums = loadEnumRegistry(dirPath, enumsFile);
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const dirs = entries
    .filter((e: { isDirectory(): boolean }) => e.isDirectory())
    .map((e: { name: string }) => e.name);
  const configs: Resource[] = [];

  for (const dir of dirs) {
    const basePath = join(dirPath, dir);

    const schemaFile = findModule(basePath, 'schema');
    const schema = schemaFile
      ? await importDefault<ZodObject<ZodRawShape>>(schemaFile)
      : undefined;

    const hooks = await loadResourceHooks(basePath);

    const jsonFile = join(basePath, 'resource.json');
    if (existsSync(jsonFile)) {
      const json = readResourceJson(jsonFile).json;
      const actions = await loadActions(json.actions ?? [], basePath, 'row');
      const tableActions = await loadActions(
        json.tableActions ?? [],
        basePath,
        'table',
      );
      const config = fromJson(
        json,
        schema,
        hooks,
        basePath,
        baseUrl,
        actions,
        tableActions,
        enums,
      );
      await loadSubResourceHooks(config.subResources ?? [], basePath);
      configs.push(config);
      continue;
    }

    const tsFile = findModule(basePath, 'resource');
    if (tsFile) {
      const config = await importDefault<Resource>(tsFile);
      if (config) configs.push(hooks ? { ...config, hooks } : config);
    }
  }

  return configs;
};
