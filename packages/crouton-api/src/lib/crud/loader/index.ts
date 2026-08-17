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
 * A `kind: "custom"` resource has no `schema.ts` — its json model is built
 * from the column `type`s — and supplies data access in `repository.ts`.
 *
 * `resource.ts` / `hooks.ts` / `schema.ts` / `repository.ts` do **not** import
 * from each other — this loader is the only place that stitches them together.
 */

import type { ZodObject, ZodRawShape } from 'zod';

import { loadActions } from '../action';
import { fromJson } from '../adapter';
import {
  loadCustomRepository,
  loadSubResourceRepositories,
} from '../custom-repository';
import { IS_DEV } from '../dev-mode';
import { loadEnumRegistry } from '../enum-registry';
import { findModule, importDefault } from './module.loader';
import { loadResourceHooks, loadSubResourceHooks } from '../hooks';
import { migrateResourceJsonFile } from '../resource/MigrateResourceJson';
import { readResourceJson } from '../resource/ReadResourceJson';
import { type Resource } from '../resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { resourceLoadReportRegistry } from '../resource/resource-load-report.registry';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const loadResourceConfigsFromDir = async (
  dirPath: string,
  baseUrl?: string,
  enumsFile?: string,
  onResourceDir?: (route: string, dir: string) => void,
): Promise<Resource[]> => {
  if (!existsSync(dirPath)) return [];

  resourceLoadErrorsRegistry.clear();
  resourceLoadReportRegistry.clear();

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
      // Bring the file to the current schema version first. In dev this rewrites it on
      // disk; elsewhere an out-of-date file is reported as a failure (not migrated).
      const migration = migrateResourceJsonFile(jsonFile, { isDev: IS_DEV });
      if (migration.status === 'failed') {
        resourceLoadErrorsRegistry.record({
          name: dir,
          path: jsonFile,
          error: migration.error,
          version: migration.version,
          expectedVersion: migration.expected,
        });
        continue;
      }
      if (migration.status === 'migrated') {
        resourceLoadReportRegistry.record({
          state: 'migrated',
          name: dir,
          path: jsonFile,
          from: migration.from,
          to: migration.to,
        });
        // eslint-disable-next-line no-console
        console.info(
          `[crouton] migrated ${jsonFile}: v${migration.from} → v${migration.to}`,
        );
      }

      const result = readResourceJson(jsonFile);

      if (!result || !result.success) {
        resourceLoadErrorsRegistry.record({
          name: dir,
          path: jsonFile,
          error: result?.error ?? `Failed to read ${jsonFile}`,
        });
        continue;
      }

      const json = result.data.json;

      // Draft resources live in the repo but are not loaded/served. They are still
      // migrated above (in dev) so they stay current until the flag is flipped.
      if (json.draft) {
        resourceLoadReportRegistry.record({
          state: 'draft',
          name: dir,
          path: jsonFile,
          version: json.schemaVersion,
        });
        continue;
      }
      // Custom resources own their data access; prisma resources never load a
      // repository, so a stray repository.ts on one is simply ignored.
      const repository =
        json.kind === 'custom'
          ? await loadCustomRepository(basePath, json.name)
          : undefined;

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
        repository,
      );
      await loadSubResourceHooks(config.subResources ?? [], basePath);
      // A custom sub-resource brings its own data access; the parent's
      // repository delegates to it instead of querying a Prisma model.
      await loadSubResourceRepositories(config.subResources ?? [], config.name);
      onResourceDir?.(config.route, basePath);
      configs.push(config);
      continue;
    }

    const tsFile = findModule(basePath, 'resource');
    if (tsFile) {
      const config = await importDefault<Resource>(tsFile);
      if (!config) continue;
      if (config.draft) {
        resourceLoadReportRegistry.record({
          state: 'draft',
          name: dir,
          path: tsFile,
          version: config.schemaVersion,
        });
        continue;
      }
      configs.push(hooks ? { ...config, hooks } : config);
    }
  }

  return configs;
};
