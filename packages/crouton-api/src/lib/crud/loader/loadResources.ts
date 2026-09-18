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
import {
  type ResourceLoadError,
  resourceLoadErrorsRegistry,
} from '../resource/resource-load-errors.registry';
import {
  type ResourceLoadNotice,
  resourceLoadReportRegistry,
} from '../resource/resource-load-report.registry';
import { existsSync } from 'node:fs';

const migrateFile = async (resourceObject: ResourceFile) => {
  const { resource: jsonFile, basePath: dir } = resourceObject;

  const migration = migrateResourceJsonFile(jsonFile, {
    isDev: IS_DEV,
  });
  const returnObj = {};

  if (migration.status === 'failed') {
    return {
      error: true,
      name: dir,
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
      name: dir,
      path: jsonFile,
      from: migration.from,
      to: migration.to,
    };
  }

  return null;
};

type SchemaReturn =
  | ({
      migration?:
        ResourceLoadNotice | ((ResourceLoadError & { error: true }) | null);
      messages?: { state: string; message: string }[];
      errors?: string[];
      warnings?: string[];
    } & { state: 'failure' })
  | { state: 'success'; config: ResourceConfig };

const readFile = async (
  resourceObject: ResourceFile /** Project enum registry — injected into columns that reference an enum by name. */,

  /** Base URL for generating full URIs in column options (e.g. `http://localhost:3000`). */
  baseUrl?: string,
  enums: EnumRegistry = {},
): Promise<SchemaReturn> => {
  const { jsonFile, basePath, hooks, schema } = resourceObject;
  const migration = await migrateFile(resourceObject);

  if (migration?.error) {
    return { migration, state: 'failure' };
  }

  const result = readResourceJson(jsonFile);

  if (!result || !result.success) {
    return {
      migration,
      state: 'failure',
      errors: [result?.error ?? `Failed to read ${jsonFile}`],
    };
  }

  const json = result.data.json;

  const messages = [];
  if (json.draft)
    messages.push({
      version: json.schemaVersion,
      state: 'draft',
    });

  const repository =
    json.kind === 'custom'
      ? await loadCustomRepository(basePath, json.name)
      : undefined;

  if (repository?.error) {
    return {
      state: 'failure',
      errors: [repository.error],
    };
  }

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

  const repositoryFileExistsOnDisk =
    json.kind !== 'custom' && !!findModule(basePath, 'repository');
  const { errors, warnings } = validateResourceConfig(config, {
    repositoryFileExistsOnDisk,
  });

  await loadSubResourceHooks(config.subResources ?? [], basePath);
  // A custom sub-resource brings its own data access; the parent's
  // repository delegates to it instead of querying a Prisma model.
  await loadSubResourceRepositories(config.subResources ?? [], config.name);

  return {
    migration,
    warnings,
    messages,
    state: 'success',
    name: basePath,
    path: jsonFile,
    config,
  } as SchemaReturn;
};

export const loadResourceConfigsFromDir = async (
  resourcePath: string,
  baseUrl?: string,
  enumsFile?: string,
  onResourceDir?: (route: string, dir: string) => void,
): Promise<Resource[]> => {
  if (!existsSync(resourcePath)) return [];

  resourceLoadErrorsRegistry.clear();
  resourceLoadReportRegistry.clear();

  const enums = loadEnumRegistry(resourcePath, enumsFile);

  const resourceTree = await BuildResourceTree(resourcePath);

  const configs: Resource[] = [];

  for (const entry of resourceTree) {
    const { jsonFile, basePath } = entry;
    const schema = await readFile(entry, baseUrl, enums);

    if (schema.migration?.state === 'error') {
      resourceLoadErrorsRegistry.record(schema.migration);
    } else if (schema.migration) {
      resourceLoadReportRegistry.record(schema.migration);
    }
    schema.errors?.forEach((error) => {
      resourceLoadErrorsRegistry.record({
        name: basePath,
        path: jsonFile,
        error,
      });
      return;
    });
    schema.warnings?.forEach((error) => {
      resourceLoadReportRegistry.record({
        state: 'warning',
        name: basePath,
        path: jsonFile,
        error,
      });
    });
    schema.messages?.forEach((message) => {
      resourceLoadReportRegistry.record({
        name: basePath,
        path: jsonFile,
        ...message,
      });
    });

    if (schema.state === 'success') {
      configs.push({
        ...entry,
        config: schema.config,
      });
    }
  }
  return configs;
};
