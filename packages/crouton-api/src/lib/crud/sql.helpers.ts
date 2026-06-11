import { buildSort } from '@ghentcdh/crouton-core';
import type { CalculatedColumn } from './loader/json-config.types';

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
  if (col.type === 'string') return (v: any) => (v === undefined || v === null ? null : String(v));
  return (v: any) => Number(v ?? 0);
};

/** Build the parameterised SQL for one calculated column query. */
const buildCalculatedColumnSql = (col: CalculatedColumn, tableName: string, ids: unknown[]): string => {
  const alias = col.alias ?? col.id;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  return `SELECT main.id, ${castExpression(col)} AS "${alias}" FROM "${tableName}" main WHERE main.id IN (${placeholders})`;
};

// ── Public helpers ────────────────────────────────────────────────────────

/**
 * Run raw SQL for each calculated column and merge results onto rows by id.
 * Each `sqlExpression` may reference the row via the alias `main`.
 */
export const mergeCalculatedColumnsForRows = async (
  rows: any[],
  calcCols: CalculatedColumn[],
  tableName: string,
  prisma: any,
): Promise<any[]> => {
  if (!calcCols.length || !rows.length) return rows;

  const ids = rows.map((r) => r.id);
  const results = await Promise.all(
    calcCols.map(async (col) => {
      const alias = col.alias ?? col.id;
      const sql = buildCalculatedColumnSql(col, tableName, ids);
      const defaultValue = defaultValueForType(col);
      const coerce = coerceColumnValue(col);
      try {
        const calcRows: any[] = await prisma.$queryRawUnsafe(sql, ...ids);
        return {
          id: col.id,
          defaultValue,
          map: Object.fromEntries(calcRows.map((r) => [String(r.id), coerce(r[alias])])),
        };
      } catch (e) {
        console.error(`[calculatedColumns] Failed for "${tableName}.${col.id}":`, e);
        return { id: col.id, defaultValue, map: {} };
      }
    }),
  );

  return rows.map((row) => {
    const extra: Record<string, unknown> = {};
    for (const { id, defaultValue, map } of results) {
      extra[id] = map[String(row.id)] ?? defaultValue;
    }
    return { ...row, ...extra };
  });
};

/** Build a Prisma `include` clause from an array of relation names. */
export const buildIncludeClause = (include: string[] | undefined) =>
  include?.length ? Object.fromEntries(include.map((r) => [r, true])) : undefined;

/**
 * Build Prisma `orderBy` supporting dotted paths like `"author.origin"`.
 * Plain names delegate to the standard `buildSort` helper.
 */
export const buildChildSortClause = (
  sort: string,
  sortDir: string | undefined,
): Record<string, unknown> => {
  const parts = sort.split('.');
  if (parts.length === 1) return buildSort(sort, sortDir) as Record<string, unknown>;
  const dir = (sortDir ?? 'asc') as 'asc' | 'desc';
  return parts.reduceRight<Record<string, unknown>>(
    (acc, part, i) => (i === parts.length - 1 ? { [part]: dir } : { [part]: acc }),
    {},
  );
};
