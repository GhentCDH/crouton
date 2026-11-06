import type { Row } from '@ghentcdh/crouton-core';

import type { SubResourceConfig } from '../../resource/SubResource.schema';
import type { PrismaClientLike } from '../../types/prisma.types';
import { getDelegate } from '../../types/prisma.types';

const DEFAULT_FIND_ALL_PARAMS = {
  page: 1,
  pageSize: 1000,
  sort: 'id',
  sortDir: 'asc' as const,
  filter: [] as string[],
  include: [] as string[],
};

const loadOneRelation = async (
  sub: SubResourceConfig,
  row: Row,
  parentIdField: string,
  prisma: unknown,
): Promise<unknown> => {
  const parentId = row[parentIdField] as string | number;

  if (sub.childKind === 'custom') {
    if (!sub.repository) return sub.relationType === 'manyToOne' ? null : [];
    const repo = sub.repository as Record<string, (...args: unknown[]) => Promise<unknown>>;

    if (sub.relationType === 'manyToOne') {
      const fk = row[sub.foreignKey] as string | number | undefined;
      if (fk == null) return null;
      return repo['findOne']?.(fk, { prisma }) ?? null;
    }
    const result = await repo['findAllByParent']?.(parentId, DEFAULT_FIND_ALL_PARAMS, { prisma });
    return (result as { data?: unknown[] } | undefined)?.data ?? [];
  }

  // Prisma child not reachable via native include (e.g. custom parent context)
  const delegate = getDelegate(prisma as PrismaClientLike, sub.childModel);
  if (!delegate) return sub.relationType === 'manyToOne' ? null : [];

  if (sub.relationType === 'manyToOne') {
    const fk = row[sub.foreignKey] as string | number | undefined;
    if (fk == null) return null;
    return delegate.findUnique({ where: { [sub.idField ?? 'id']: fk } });
  }
  return delegate.findMany({ where: { [sub.foreignKey]: parentId } });
};

/**
 * Embed sub-resource relations into a row after the main fetch.
 * Used for custom children (and Prisma children in a custom-parent context)
 * that cannot be loaded via Prisma native `include`.
 */
export const loadRelationsIntoRow = async (
  row: Row,
  subsToLoad: SubResourceConfig[],
  parentIdField: string,
  prisma: unknown,
): Promise<Row> => {
  if (!subsToLoad.length) return row;

  const patches = await Promise.all(
    subsToLoad.map(async (sub) => {
      const data = await loadOneRelation(sub, row, parentIdField, prisma);
      return [sub.column, data] as const;
    }),
  );

  return { ...row, ...Object.fromEntries(patches) };
};

const batchLoadRelation = async (
  rows: Row[],
  sub: SubResourceConfig,
  parentIdField: string,
  prisma: unknown,
): Promise<Row[]> => {
  if (sub.childKind !== 'custom') {
    const delegate = getDelegate(prisma as PrismaClientLike, sub.childModel);
    if (!delegate) return rows;

    if (sub.relationType === 'manyToOne') {
      const fks = [...new Set(rows.map((r) => r[sub.foreignKey]).filter((v) => v != null))];
      if (!fks.length) return rows.map((r) => ({ ...r, [sub.column]: null }));
      const idField = sub.idField ?? 'id';
      const children = (await delegate.findMany({ where: { [idField]: { in: fks } } })) as Row[];
      const byId = new Map(children.map((c) => [String(c[idField]), c]));
      return rows.map((r) => ({
        ...r,
        [sub.column]: r[sub.foreignKey] != null ? (byId.get(String(r[sub.foreignKey])) ?? null) : null,
      }));
    }

    const parentIds = [...new Set(rows.map((r) => r[parentIdField]).filter((v) => v != null))];
    if (!parentIds.length) return rows.map((r) => ({ ...r, [sub.column]: [] }));
    const children = (await delegate.findMany({ where: { [sub.foreignKey]: { in: parentIds } } })) as Row[];
    const byParent = new Map<string, Row[]>();
    for (const child of children) {
      const pid = String(child[sub.foreignKey]);
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid)?.push(child);
    }
    return rows.map((r) => ({
      ...r,
      [sub.column]: byParent.get(String(r[parentIdField])) ?? [],
    }));
  }

  // ponytail: custom child N+1 per row; batch by adding findAllBy(field, values) to CustomRepository when throughput matters
  if (!sub.repository) return rows.map((r) => ({ ...r, [sub.column]: sub.relationType === 'manyToOne' ? null : [] }));
  return Promise.all(rows.map((row) => loadRelationsIntoRow(row, [sub], parentIdField, prisma)));
};

/**
 * Embed sub-resource relations into multiple rows after the main fetch.
 * Prisma children are batched (one query per relation); custom children are N+1.
 */
export const loadRelationsIntoRows = async (
  rows: Row[],
  subsToLoad: SubResourceConfig[],
  parentIdField: string,
  prisma: unknown,
): Promise<Row[]> => {
  if (!subsToLoad.length || !rows.length) return rows;

  let result = rows;
  for (const sub of subsToLoad) {
    result = await batchLoadRelation(result, sub, parentIdField, prisma);
  }
  return result;
};
