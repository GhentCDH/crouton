import { type ResourceConfig } from '@ghentcdh/crouton-core';

import { type EnumRegistry, loadEnumRegistry } from '../enum-registry';
import { findModule } from './module.loader';
import { loadActions } from '../action';
import { fromJson } from '../adapter';
import {
  loadCustomRepository,
  loadSubResourceRepositories,
} from '../custom-repository';
import { IS_DEV } from '../dev-mode';
import { loadSubResourceHooks } from '../hooks';
import { BuildResourceTree, type ResourceFile } from './read-resource';
import { migrateResourceJsonFile } from '../resource/MigrateResourceJson';
import { readResourceJson } from '../resource/ReadResourceJson';
import type { Resource } from '../resource/ResourceConfig.schema';
import { validateResourceConfig } from '../resource/resource-config.validator';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { resourceLoadReportRegistry } from '../resource/resource-load-report.registry';
import { existsSync } from 'node:fs';

const migrateFile = (resourceObject: ResourceFile) => {
  const { jsonFile, basePath } = resourceObject;

  const migration = migrateResourceJsonFile(jsonFile, { isDev: IS_DEV });

  if (migration.status === 'failed') {
    return {
      isFailed: true as const,
      name: basePath,
      path: jsonFile,
      error: migration.error,
      version: migration.version,
      expectedVersion: migration.expected,
    };
  }

  if (migration.status === 'migrated') {
    // eslint-disable-next-line no-console
    console.info(
      `[crouton] migrated ${jsonFile}: v${migration.from} → v${migration.to}`,
    );
    return {
      isFailed: false as const,
      state: 'migrated' as const,
      name: basePath,
      path: jsonFile,
      from: migration.from,
      to: migration.to,
    };
  }

  return null;
};

const readFile = async (
  resourceObject: ResourceFile,
  baseUrl?: string,
  enums: EnumRegistry = {},
): Promise<{ state: 'failure' } | { state: 'success'; config: ResourceConfig }> => {
  const { jsonFile, basePath, hooks, schema } = resourceObject;
  const migration = migrateFile(resourceObject);

  if (migration?.isFailed) {
    resourceLoadErrorsRegistry.record(migration);
    return { state: 'failure' };
  }

  if (migration?.state === 'migrated') {
    resourceLoadReportRegistry.record(migration);
  }

  const result = readResourceJson(jsonFile);
  if (!result || !result.success) {
    resourceLoadErrorsRegistry.record({
      name: basePath,
      path: jsonFile,
      error: result?.error ?? `Failed to read ${jsonFile}`,
    });
    return { state: 'failure' };
  }

  const json = result.data.json;

  if (json.draft) {
    resourceLoadReportRegistry.record({
      state: 'draft',
      name: basePath,
      path: jsonFile,
      version: json.schemaVersion,
    });
    return { state: 'failure' };
  }

  const errorsBeforeRepo = resourceLoadErrorsRegistry.getAll().length;
  const repository =
    json.kind === 'custom'
      ? await loadCustomRepository(basePath, json.name)
      : undefined;
  const repositoryImportFailed =
    resourceLoadErrorsRegistry.getAll().length > errorsBeforeRepo;

  if (repositoryImportFailed) return { state: 'failure' };

  const actions = await loadActions(json.actions ?? [], basePath, 'row');
  const tableActions = await loadActions(json.tableActions ?? [], basePath, 'table');

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

  const repositoryFileExistsOnDisk =
    json.kind !== 'custom' && !!findModule(basePath, 'repository');
  const { errors, warnings } = validateResourceConfig(config, {
    repositoryFileExistsOnDisk,
  });

  for (const error of errors) {
    resourceLoadErrorsRegistry.record({ name: basePath, path: jsonFile, error });
  }
  for (const warning of warnings) {
    resourceLoadReportRegistry.record({
      state: 'warning',
      name: config.name,
      path: jsonFile,
      warning,
    });
  }

  if (errors.length > 0) return { state: 'failure' };

  await loadSubResourceHooks(config.subResources ?? [], basePath);
  // A custom sub-resource brings its own data access; the parent's
  // repository delegates to it instead of querying a Prisma model.
  await loadSubResourceRepositories(config.subResources ?? [], config.name);

  return { state: 'success', config };
};

export const loadResourceConfigsFromDir = async (
  resourcePath: string,
  baseUrl?: string,
  enumsFile?: string,
): Promise<Resource[]> => {
  if (!existsSync(resourcePath)) return [];

  resourceLoadErrorsRegistry.clear();
  resourceLoadReportRegistry.clear();

  const enums = loadEnumRegistry(resourcePath, enumsFile);
  const resourceTree = await BuildResourceTree(resourcePath);
  const configs: Resource[] = [];

  for (const entry of resourceTree) {
    const result = await readFile(entry, baseUrl, enums);
    if (result.state === 'success') {
      configs.push({ ...entry, config: result.config });
    }
  }
  return configs;
};