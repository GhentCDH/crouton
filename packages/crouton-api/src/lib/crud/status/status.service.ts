import { CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';

import type { DataSourceRegistry } from '../data-source';
import type {
  CroutonStatus,
  DatabaseStatus,
  ResourceStatus,
  StatusSummary,
} from './status.types';
import type { Resource } from '../resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';
import { resourceLoadReportRegistry } from '../resource/resource-load-report.registry';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DB_CHECK_TIMEOUT_MS = 3_000;

const CONNECTION_STRING_PATTERN =
  /(?:postgresql|postgres|mysql|mongodb|sqlserver|sqlite):\/\/[^\s"')]+/gi;

const stripConnectionStrings = (message: string): string =>
  message.replace(CONNECTION_STRING_PATTERN, '[REDACTED]');

export const getCroutonVersion = (): string => {
  try {
    const startDir =
      typeof __dirname !== 'undefined'
        ? __dirname
        : dirname(fileURLToPath(import.meta.url));

    let dir = startDir;
    while (dir !== dirname(dir)) {
      const pkgPath = join(dir, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === '@ghentcdh/crouton-api') return pkg.version;
      }
      dir = dirname(dir);
    }
  } catch {
    // ignore
  }
  return 'unknown';
};

export const getVersion = (): string =>
  process.env['APP_VERSION'] ?? 'unknown';

export const getEnvironment = (): string =>
  process.env['ENVIRONMENT'] ?? process.env['NODE_ENV'] ?? 'unknown';

export const checkDatabases = async (
  registry: DataSourceRegistry,
): Promise<DatabaseStatus[]> => {
  const entries = registry.entries();
  const results: DatabaseStatus[] = [];

  for (const { name, client } of entries) {
    try {
      await Promise.race([
        client.$queryRaw`SELECT 1`,
        new Promise((_resolve, reject) =>
          setTimeout(
            () => reject(new Error('Database health check timed out')),
            DB_CHECK_TIMEOUT_MS,
          ),
        ),
      ]);
      results.push({ name, connected: true });
    } catch (err) {
      results.push({
        name,
        connected: false,
        error: stripConnectionStrings((err as Error).message),
      });
    }
  }

  return results;
};

export const getResourceStatus = (
  loadedConfigs: Resource[],
): ResourceStatus[] => {
  const valid: ResourceStatus[] = loadedConfigs.map((c) => ({
    name: c.name,
    path: c.route,
    valid: true,
    version: c.schemaVersion ?? CURRENT_RESOURCE_VERSION,
    ...(c.sidebar?.hide ? { hidden: true } : {}),
  }));

  const failed: ResourceStatus[] = resourceLoadErrorsRegistry
    .getAll()
    .map((e) => ({
      name: e.name,
      path: e.path,
      valid: false,
      error: e.error,
      version: e.version,
      expectedVersion: e.expectedVersion,
    }));

  // Drafts are present-but-not-served — informational, not errors (valid: true).
  const draft: ResourceStatus[] = resourceLoadReportRegistry
    .getByState('draft')
    .map((d) => ({
      name: d.name,
      path: d.path,
      valid: true,
      draft: true,
      version: d.version,
    }));

  return [...valid, ...failed, ...draft];
};

export const buildSummary = (
  databases: DatabaseStatus[],
  resources: ResourceStatus[],
): StatusSummary => {
  const databaseErrors = databases.filter((d) => !d.connected).length;
  const resourceErrors = resources.filter((r) => !r.valid).length;

  return {
    ok: databaseErrors === 0 && resourceErrors === 0,
    databaseErrors,
    resourceErrors,
  };
};

export const buildStatus = async (
  registry: DataSourceRegistry,
  loadedConfigs: Resource[],
): Promise<CroutonStatus> => {
  const databases = await checkDatabases(registry);
  const resources = getResourceStatus(loadedConfigs);
  const summary = buildSummary(databases, resources);

  return {
    version: getVersion(),
    croutonVersion: getCroutonVersion(),
    environment: getEnvironment(),
    summary,
    databases,
    resources,
  };
};