import {
  type JsonColumn,
  type NormalizedUnique,
  normalizeUnique,
} from '@ghentcdh/crouton-core';

import { PRISMA_UNIQUE_CONSTRAINT_CODE } from './constants';
import { CroutonValidationError } from './crouton-validation.error';
import { type DataSourceRegistry } from './data-source';
import { type Resource } from './resource/ResourceConfig.schema';

/**
 * Shared helpers for column-level uniqueness: resolving which columns are
 * declared `unique`, mapping between field ids and DB column names, and turning
 * a Prisma unique-constraint violation into the same field-scoped
 * `CroutonValidationError` the form already renders.
 */

/** The resource's columns as a flat array (the compiled config stores them so). */
const columnsOf = (config: Resource): JsonColumn[] =>
  (config.columns as unknown as JsonColumn[] | undefined) ?? [];

/** The DB column name backing a resource column (`column` override, else `id`). */
export const columnDbName = (col: JsonColumn): string => col.column ?? col.id;

/** Find a column by its field id. */
export const columnById = (
  config: Resource,
  id: string,
): JsonColumn | undefined => columnsOf(config).find((c) => c.id === id);

/** Resolve a field id to its DB column name (falls back to the id itself). */
export const dbNameForId = (config: Resource, id: string): string => {
  const col = columnById(config, id);
  return col ? columnDbName(col) : id;
};

/** Columns on this resource that declare uniqueness, paired with the normalized flag. */
export const uniqueColumns = (
  config: Resource,
): Array<{ column: JsonColumn; unique: NormalizedUnique }> =>
  columnsOf(config)
    .map((column) => ({ column, unique: normalizeUnique(column.unique) }))
    .filter(
      (e): e is { column: JsonColumn; unique: NormalizedUnique } =>
        e.unique != null,
    );

/** Find a declared-unique column by its field id. Returns `undefined` when the field is not unique. */
export const findUniqueColumn = (
  config: Resource,
  fieldId: string,
): { column: JsonColumn; unique: NormalizedUnique } | undefined =>
  uniqueColumns(config).find((e) => e.column.id === fieldId);

/** Resolve a Prisma `meta.target` (array, string, or absent) to DB column names. */
const extractTargets = (meta: unknown): string[] => {
  const target = (meta as { target?: unknown } | undefined)?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === 'string') return [target];
  return [];
};

/** Map a DB column name (or constraint target) back to its resource column id. */
const columnForTarget = (
  config: Resource,
  target: string,
): JsonColumn | undefined =>
  columnsOf(config).find((c) => columnDbName(c) === target || c.id === target);

const sameSet = (a: string[], b: string[]): boolean =>
  a.length === b.length && new Set([...a, ...b]).size === a.length;

/**
 * Translate a Prisma P2002 unique-constraint error into a `CroutonValidationError`.
 *
 * A composite constraint (`meta.target` naming several columns) is attributed to
 * the single declared-unique column whose `id` + `scope` matches the target set,
 * so the error lands on the field the user edits rather than on every member of
 * the index. Anything else maps one error per offending column. Returns
 * `undefined` for non-P2002 errors (caller rethrows).
 */
export const mapPrismaUniqueError = (
  e: unknown,
  config: Resource,
): CroutonValidationError | undefined => {
  if (
    (e as { code?: string } | undefined)?.code !== PRISMA_UNIQUE_CONSTRAINT_CODE
  )
    return undefined;

  const targets = extractTargets((e as { meta?: unknown }).meta);

  // Composite constraint → attribute to the owning unique column only.
  if (targets.length > 1) {
    for (const { column, unique } of uniqueColumns(config)) {
      const names = [
        columnDbName(column),
        ...(unique.scope ?? []).map((id) => dbNameForId(config, id)),
      ];
      if (sameSet(names, targets)) {
        const label = column.label ?? column.id;
        return new CroutonValidationError([
          {
            field: column.id,
            message: unique.message ?? `${label} already exists`,
            code: 'unique',
          },
        ]);
      }
    }
  }

  const resolved = targets.length ? targets : ['value'];
  const errors = resolved.map((target) => {
    const col = columnForTarget(config, target);
    const unique = normalizeUnique(col?.unique);
    const label = col?.label ?? col?.id ?? target;
    return {
      field: col?.id ?? target,
      message: unique?.message ?? `${label} already exists`,
      code: 'unique',
    };
  });

  return new CroutonValidationError(errors);
};

// ── Dev-mode DMMF constraint check ──────────────────────────────────────────

/**
 * Read the set of DB column names that have a single-column @unique (or @id)
 * constraint from the Prisma DMMF, plus the member field-name sets for composite
 * unique indexes. Returns null when the DMMF isn't accessible.
 */
const dmmfUniqueInfo = (
  client: unknown,
  modelName: string,
): { singleColumns: Set<string>; compositeFieldSets: Set<string>[] } | null => {
  try {
    const dmmf = (client as any)?._baseDmmf;
    if (!dmmf) return null;
    const model = dmmf.modelMap?.[modelName];
    if (!model) return null;

    const singleColumns = new Set<string>();
    for (const field of (model.fields ?? []) as any[]) {
      if (field.isUnique || field.isId) singleColumns.add(field.dbName ?? field.name);
    }

    const compositeFieldSets: Set<string>[] = (model.uniqueFields ?? [] as string[][])
      .filter((f: string[]) => f.length > 1)
      .map((f: string[]) => new Set(f));

    return { singleColumns, compositeFieldSets };
  } catch {
    return null;
  }
};

/**
 * In non-production environments, warn when a column declares `unique` but the
 * Prisma model has no matching @unique (or @@unique) constraint. Without the DB
 * constraint, a race between two concurrent creates can bypass the async check.
 */
export const warnMissingUniqueConstraints = (
  configs: Resource[],
  dataSourceRegistry: DataSourceRegistry,
): void => {
  if (process.env['NODE_ENV'] === 'production') return;

  for (const config of configs) {
    const cols = uniqueColumns(config);
    if (!cols.length || !config.model) continue;

    let client: unknown;
    try {
      const adapter = dataSourceRegistry.resolveAdapter(config.database);
      if (adapter.kind !== 'prisma') continue;
      client = adapter.client;
    } catch {
      continue;
    }

    const info = dmmfUniqueInfo(client, config.model);
    if (!info) continue; // DMMF not available — skip silently

    for (const { column, unique } of cols) {
      const dbName = columnDbName(column);

      if (!unique.scope?.length) {
        // Simple single-column uniqueness.
        if (!info.singleColumns.has(dbName)) {
          console.warn(
            `[crouton] WARNING: column "${column.id}" on resource "${config.name}" declares ` +
              `unique: true but Prisma model "${config.model}" has no @unique on "${dbName}". ` +
              `Add @unique to the Prisma schema to enforce the race-condition guarantee.`,
          );
        }
      } else {
        // Composite uniqueness: check for a @@unique([dbName, ...scope dbNames]).
        const expectedSet = new Set([
          dbName,
          ...unique.scope.map((id) => dbNameForId(config, id)),
        ]);
        const hasComposite = info.compositeFieldSets.some(
          (s) =>
            s.size === expectedSet.size &&
            [...expectedSet].every((f) => s.has(f)),
        );
        if (!hasComposite) {
          console.warn(
            `[crouton] WARNING: column "${column.id}" on resource "${config.name}" declares ` +
              `composite unique (scope: ${JSON.stringify(unique.scope)}) but Prisma model ` +
              `"${config.model}" has no matching @@unique constraint. ` +
              `Add @@unique([${[dbName, ...expectedSet].join(', ')}]) to the Prisma schema.`,
          );
        }
      }
    }
  }
};
