import type {
  CalculatedColumn,
  JsonIncludeEntry,
} from '@ghentcdh/crouton-core';

import type { SubResourceConfig } from '../../resource/SubResource.schema'; // ── SQL expression helpers ────────────────────────────────────────────────

// ── SQL expression helpers ────────────────────────────────────────────────

/** Wrap a column's SQL expression with the appropriate CAST for its type. */
const castExpression = (col: CalculatedColumn): string => {
  if (col.type === 'string') return `(${col.sqlExpression})`;
  if (col.type === 'boolean') return `CAST((${col.sqlExpression}) AS BOOLEAN)`;
  return `CAST((${col.sqlExpression}) AS INTEGER)`;
};

/** Default value for a column type when a SQL query fails or returns null. */
const defaultValueForType = (col: CalculatedColumn): unknown => {
  if (col.type === 'boolean') return false;
  if (col.type === 'string') return null;
  return 0;
};

/** Coercion function for the column's type. */
const coerceColumnValue = (col: CalculatedColumn) => {
  if (col.type === 'boolean') return (v: any) => Boolean(v);
  if (col.type === 'string')
    return (v: any) => (v === undefined || v === null ? null : String(v));
  return (v: any) => Number(v ?? 0);
};

/**
 * Choose the parameterised-placeholder syntax for the given database provider.
 *
 * - PostgreSQL / CockroachDB: `$1, $2, …` (positional)
 * - SQLite / MySQL: `?, ?, …` (unnamed)
 */
const buildPlaceholders = (ids: unknown[], provider: string): string => {
  if (provider === 'sqlite' || provider === 'mysql') {
    return ids.map(() => '?').join(', ');
  }
  return ids.map((_, i) => `$${i + 1}`).join(', ');
};

/** Build the parameterised SQL for one calculated column query. */
const buildCalculatedColumnSql = (
  col: CalculatedColumn,
  tableName: string,
  ids: unknown[],
  idField: string,
  provider: string,
): string => {
  const alias = col.alias ?? col.id;
  const placeholders = buildPlaceholders(ids, provider);
  // The key column is aliased to `id` so the caller can merge on a stable name
  // regardless of what the resource's primary key is called.
  return `SELECT main."${idField}" AS id, ${castExpression(col)} AS "${alias}" FROM "${tableName}" main WHERE main."${idField}" IN (${placeholders})`;
};

// ── Public helpers ────────────────────────────────────────────────────────

/**
 * Run raw SQL for each calculated column and merge results onto rows by id.
 * Each `sqlExpression` may reference the row via the alias `main`.
 *
 * @param idField - Primary key column of `tableName`. Defaults to `'id'`.
 * @param provider - Database provider for placeholder syntax (`'postgresql'`, `'sqlite'`, etc.).
 */
export const mergeCalculatedColumnsForRows = async (
  rows: any[],
  calcCols: CalculatedColumn[],
  tableName: string,
  prisma: any,
  idField = 'id',
  provider = 'postgresql',
): Promise<any[]> => {
  if (!calcCols.length || !rows.length) return rows;

  const ids = rows.map((r) => r[idField]);
  const results = await Promise.all(
    calcCols.map(async (col) => {
      const alias = col.alias ?? col.id;
      const sql = buildCalculatedColumnSql(
        col,
        tableName,
        ids,
        idField,
        provider,
      );
      const defaultValue = defaultValueForType(col);
      const coerce = coerceColumnValue(col);
      try {
        const calcRows: any[] = await prisma.$queryRawUnsafe(sql, ...ids);
        return {
          id: col.id,
          defaultValue,
          map: Object.fromEntries(
            calcRows.map((r) => [String(r.id), coerce(r[alias])]),
          ),
        };
      } catch (e) {
        console.error(
          `[calculatedColumns] Failed for "${tableName}.${col.id}":`,
          e,
        );
        return { id: col.id, defaultValue, map: {} };
      }
    }),
  );

  return rows.map((row) => {
    const extra: Record<string, unknown> = {};
    for (const { id, defaultValue, map } of results) {
      extra[id] = map[String(row[idField])] ?? defaultValue;
    }
    return { ...row, ...extra };
  });
};

/**
 * Build a Prisma `include` clause from an array of `JsonIncludeEntry` values.
 *
 * Supports three forms:
 * - Plain string:  `"author"` → `{ author: true }`
 * - Dotted string: `"author.internal_author"` → `{ author: { include: { internal_author: true } } }`
 * - Object:        `{ relation: "author", include: ["internal_author"] }` → same as above
 *
 * Multiple entries for the same relation are merged:
 *   `["author", "author.internal_author"]`
 *   → `{ author: { include: { internal_author: true } } }`
 */
export const buildIncludeClause = (
  include: JsonIncludeEntry[] | undefined,
): Record<string, unknown> | undefined => {
  if (!include?.length) return undefined;

  // Normalise every entry to { relation, nestedIncludes[], orderBy? }
  const map = new Map<string, JsonIncludeEntry[]>();
  const orderByMap = new Map<string, Record<string, unknown>>();

  for (const entry of include) {
    if (typeof entry === 'string') {
      const dotIdx = entry.indexOf('.');
      if (dotIdx === -1) {
        // Plain relation — only add if nothing more specific already exists
        if (!map.has(entry)) map.set(entry, []);
      } else {
        // Dotted path: "author.internal_author" → relation "author", nested "internal_author"
        const relation = entry.slice(0, dotIdx);
        const rest = entry.slice(dotIdx + 1) as JsonIncludeEntry;
        map.set(relation, [...(map.get(relation) ?? []), rest]);
      }
    } else {
      // Object form: { relation, include[], orderBy? }
      map.set(entry.relation, [
        ...(map.get(entry.relation) ?? []),
        ...(entry.include ?? []),
      ]);
      if (entry.orderBy) orderByMap.set(entry.relation, entry.orderBy);
    }
  }

  return Object.fromEntries(
    Array.from(map.entries()).map(([relation, nestedIncludes]) => {
      const orderBy = orderByMap.get(relation);
      if (!nestedIncludes.length && !orderBy) return [relation, true];
      const nested = buildIncludeClause(nestedIncludes);
      const clause: Record<string, unknown> = {};
      if (nested) clause.include = nested;
      if (orderBy) clause.orderBy = orderBy;
      return [relation, clause];
    }),
  );
};

/**
 * Build the merged Prisma `include` clause for `findOne`.
 *
 * Auto-included sub-resources (`includeInFindOne`) are merged with explicit
 * `configInclude` entries. `configInclude` wins when both specify the same relation.
 *
 * A `kind: "custom"` child is skipped: it is reached through its own
 * `repository.ts`, so there is no Prisma relation of that name to include and
 * asking for one fails the entire query.
 */
export const buildFindOneIncludes = (
  subResources: SubResourceConfig[],
  configInclude: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  const autoSubs = subResources.filter(
    (s) => s.includeInFindOne && s.childKind !== 'custom',
  );
  const flatIncludes = autoSubs.length
    ? Object.fromEntries(
        autoSubs.map((s) =>
          s.findOneOrderBy
            ? [s.relation, { orderBy: s.findOneOrderBy }]
            : [s.relation, true],
        ),
      )
    : undefined;

  if (!flatIncludes && !configInclude) return undefined;
  return { ...flatIncludes, ...configInclude };
};
