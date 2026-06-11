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
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { fromJson } from './json-adapter';
import { loadActions } from './action.loader';
import { findModule, importDefault } from './module.loader';
import type { JsonResourceConfig } from './json-config.types';
import type { ResourceConfig, ResourceHooks, SubResourceConfig } from '../crud.config';

const loadSubResourceHooks = async (
  subResources: SubResourceConfig[],
  basePath: string,
): Promise<void> => {
  for (const sub of subResources) {
    const file = sub.name ? findModule(join(basePath, 'hooks'), sub.name) : undefined;
    if (!file) continue;
    const hooks = await importDefault<ResourceHooks>(file);
    if (hooks) (sub as any).hooks = hooks;
  }
};

export const loadResourceConfigsFromDir = async (
  dirPath: string,
  baseUrl?: string,
): Promise<ResourceConfig[]> => {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const dirs = entries.filter((e: { isDirectory(): boolean }) => e.isDirectory()).map((e: { name: string }) => e.name);
  const configs: ResourceConfig[] = [];

  for (const dir of dirs) {
    const basePath = join(dirPath, dir);

    const schemaFile = findModule(basePath, 'schema');
    const schema = schemaFile ? await importDefault<ZodObject<ZodRawShape>>(schemaFile) : undefined;

    const hooksFile = findModule(basePath, 'hooks');
    const hooks = hooksFile ? await importDefault<ResourceHooks>(hooksFile) : undefined;

    const jsonFile = join(basePath, 'resource.json');
    if (existsSync(jsonFile)) {
      const json: JsonResourceConfig = JSON.parse(readFileSync(jsonFile, 'utf-8'));
      const actions = await loadActions(json.actions ?? [], basePath);
      const config = fromJson(json, schema, hooks, basePath, baseUrl, actions);
      await loadSubResourceHooks(config.subResources ?? [], basePath);
      configs.push(config);
      continue;
    }

    const tsFile = findModule(basePath, 'resource');
    if (tsFile) {
      const config = await importDefault<ResourceConfig>(tsFile);
      if (config) configs.push(hooks ? { ...config, hooks } : config);
    }
  }

  return configs;
};
