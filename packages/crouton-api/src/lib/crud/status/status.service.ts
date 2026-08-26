import { CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';

import { CUSTOM_OPS } from '../custom-repository';
import type { DataSourceRegistry } from '../data-source';
import type {
  CroutonStatus,
  DatabaseStatus,
  EnumGroup,
  EnumSections,
  I18nStatus,
  ResourceStatus,
  StatusSummary,
} from './status.types';
import type { TranslationRegistry } from '../translation/translation.registry';
import type { EnumRegistry } from '../enum-registry/enum-registry.types';
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
    kind: c.kind ?? 'prisma',
    // Which operations the user's repository.ts actually implements. A resource
    // only reaches this list after validateCustomRepository passed, so this is
    // informational rather than a warning.
    ...(c.kind === 'custom' && c.repository
      ? {
          customOperations: CUSTOM_OPS.filter(
            (op) => typeof (c.repository as any)?.[op] === 'function',
          ),
        }
      : {}),
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

/**
 * Extract built-in enums from Zod schema definitions.
 * These are system-level enums used throughout the framework.
 */
const getSystemEnums = (): EnumGroup[] => {
  return [
    {
      name: 'RelationType',
      category: 'Relationships',
      values: [
        { value: 'oneToOne', label: 'One to One' },
        { value: 'manyToOne', label: 'Many to One' },
        { value: 'oneToMany', label: 'One to Many' },
        { value: 'manyToMany', label: 'Many to Many' },
      ],
    },
    {
      name: 'DetailLayout',
      category: 'Layout',
      values: [
        { value: 'collapse', label: 'Collapse' },
        { value: 'row', label: 'Row' },
      ],
    },
    {
      name: 'SortDirection',
      category: 'Sorting',
      values: [
        { value: 'asc', label: 'Ascending' },
        { value: 'desc', label: 'Descending' },
      ],
    },
    {
      name: 'DisplayMode',
      category: 'Display',
      values: [
        { value: 'page', label: 'Page' },
        { value: 'modal', label: 'Modal' },
      ],
    },
    {
      name: 'ModalSize',
      category: 'Display',
      values: [
        { value: 'xs', label: 'Extra Small' },
        { value: 'sm', label: 'Small' },
        { value: 'lg', label: 'Large' },
        { value: 'xl', label: 'Extra Large' },
      ],
    },
  ];
};

/**
 * Convert project enum registry into EnumGroup format.
 * Groups enums from crouton.enums.json by generic category.
 */
const getProjectEnums = (enumRegistry: EnumRegistry): EnumGroup[] => {
  if (!enumRegistry) return [];
  return Object.entries(enumRegistry).map(([name, entries]) => ({
    name,
    category: 'Project',
    values: entries.map((entry) => ({
      value: entry.value,
      label: entry.label,
    })),
  }));
};

/**
 * Collect all enums (system and project) for display on status page.
 */
const getEnums = (enumRegistry: EnumRegistry): EnumSections => {
  return {
    system: getSystemEnums(),
    project: getProjectEnums(enumRegistry),
  };
};

/** Count leaf string keys in a nested object, and how many are empty. */
const countKeys = (
  obj: Record<string, unknown>,
  prefix = '',
): { total: number; empty: number } => {
  let total = 0;
  let empty = 0;
  for (const [, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      total++;
      if (v === '') empty++;
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      const sub = countKeys(v as Record<string, unknown>, prefix);
      total += sub.total;
      empty += sub.empty;
    }
  }
  return { total, empty };
};

const getI18nStatus = (
  translationRegistry?: TranslationRegistry,
): I18nStatus | undefined => {
  if (!translationRegistry?.active) return undefined;
  const languages = [...translationRegistry.languages];
  const bundles = languages.map((language) => {
    const bundle = translationRegistry.bundleFor(language);
    const { total, empty } = countKeys(bundle as Record<string, unknown>);
    return { language, keyCount: total, emptyKeys: empty };
  });
  return {
    active: true,
    defaultLanguage: translationRegistry.defaultLanguage,
    languages,
    bundles,
  };
};

export const buildStatus = async (
  registry: DataSourceRegistry,
  loadedConfigs: Resource[],
  enumRegistry: EnumRegistry,
  translationRegistry?: TranslationRegistry,
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
    enums: getEnums(enumRegistry),
    ...(translationRegistry?.active && {
      i18n: getI18nStatus(translationRegistry),
    }),
  };
};
