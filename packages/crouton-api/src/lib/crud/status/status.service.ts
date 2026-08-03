import type { DataSourceRegistry } from '../data-source';
import type {
  CroutonStatus,
  DatabaseStatus,
  ResourceStatus,
  StatusSummary,
} from './status.types';
import type { Resource } from '../resource/ResourceConfig.schema';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';

const DB_CHECK_TIMEOUT_MS = 3_000;

const CONNECTION_STRING_PATTERN =
  /(?:postgresql|postgres|mysql|mongodb|sqlserver|sqlite):\/\/[^\s"')]+/gi;

const stripConnectionStrings = (message: string): string =>
  message.replace(CONNECTION_STRING_PATTERN, '[REDACTED]');

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
  }));

  const failed: ResourceStatus[] = resourceLoadErrorsRegistry
    .getAll()
    .map((e) => ({
      name: e.name,
      path: e.path,
      valid: false,
      error: e.error,
    }));

  return [...valid, ...failed];
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
    environment: getEnvironment(),
    summary,
    databases,
    resources,
  };
};