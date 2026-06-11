import { NotFoundException } from '@nestjs/common';

import { Operator, type OperatorType, buildSort } from '@ghentcdh/crouton-core';

import type { ReadOp, ResourceConfig, SubResourceConfig } from './crud.config';
import type { RequestDto } from './request.dto';
import { buildChildSortClause, buildIncludeClause, mergeCalculatedColumnsForRows } from './sql.helpers';

// FilterOperator (OperatorType) and Operator list are imported from @ghentcdh/crouton-core

/**
 * Parse a filter string of the form `field:value:operator`.
 * The last segment is treated as the operator only when it matches a known value.
 * Values that contain colons are handled correctly (everything between the first and last colon is the value).
 * Defaults to `contains` when no recognised operator is present.
 */
export const parseFilterString = (
  raw: string,
): { field: string; value: string; operator: OperatorType } | null => {
  const parts = raw.split(':');
  if (parts.length < 2 || !parts[0]) return null;

  const field = parts[0];
  const lastPart = parts[parts.length - 1];
  const hasOperator = (Operator as readonly string[]).includes(lastPart);

  const value = hasOperator ? parts.slice(1, -1).join(':') : parts.slice(1).join(':');
  const operator: OperatorType = hasOperator ? (lastPart as OperatorType) : 'contains';

  return { field, value, operator };
};

/**
 * Build a nested Prisma condition object from a dot-separated field path.
 * `"author.name"` → `{ author: { name: condition } }`
 */
const buildNestedPath = (path: string[], condition: unknown): Record<string, unknown> => {
  if (path.length === 1) return { [path[0]]: condition };
  const [head, ...rest] = path;
  return { [head]: buildNestedPath(rest, condition) };
};

/**
 * Map a parsed operator + value to a Prisma field condition.
 * Numeric coercion is applied for `gt` and `lt`.
 */
const operatorToCondition = (value: string, operator: FilterOperator): unknown => {
  const num = Number(value);
  const numVal = Number.isNaN(num) ? value : num;

  switch (operator) {
    case 'contains':
      return { contains: value };
    case 'not_contains':
      return { not: { contains: value } };
    case 'equals':
      return { equals: value };
    case 'not_equals':
      return { not: value };
    case 'gt':
      return { gt: numVal };
    case 'lt':
      return { lt: numVal };
    case 'isnull':
      return null;
    case 'isnotnull':
      return { not: null };
  }
};

/**
 * Build a Prisma `where` clause from an array of filter strings.
 * Returns `undefined` (no filter) when the array is empty or all entries are unparseable.
 */
export const buildFilterWhere = (
  filter: string[] | undefined,
): Record<string, unknown> | undefined => {
  if (!filter?.length) return undefined;

  const conditions = filter
    .map(parseFilterString)
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .map(({ field, value, operator }) =>
      buildNestedPath(field.split('.'), operatorToCondition(value, operator)),
    );

  return conditions.length ? { AND: conditions } : undefined;
};

/**
 * Handles all read operations for a resource — list, count, detail, and sub-resource queries.
 *
 * Constructed by `createCrudRepository`; instantiate directly only in tests.
 *
 * @param prismaModel - The Prisma delegate for the resource's model (e.g. `prisma.text`).
 * @param prisma - Full PrismaClient, used for sub-resource queries and calculated columns.
 * @param config - Resource config including model name, idType, hooks, and sub-resources.
 * @param listSelect - Prisma `select` clause for list queries, derived from the `findAll` schema. `undefined` = select all.
 * @param oneSelect - Prisma `select` clause for detail queries. Falls back to `listSelect` when absent.
 */
export class ReadRepository<T = any> {
  constructor(
    private readonly prismaModel: any,
    private readonly prisma: any,
    private readonly config: ResourceConfig,
    private readonly listSelect: Record<string, any> | undefined,
    private readonly oneSelect: Record<string, any> | undefined,
  ) {}

  private toId(id: string | number): string | number {
    return (this.config.idType ?? 'string') === 'number' ? +id : String(id);
  }

  private buildWhere(filter: string[] | undefined) {
    return buildFilterWhere(filter);
  }

  private projection(op: 'findAll' | 'findOne') {
    const select = op === 'findAll' ? this.listSelect : this.oneSelect;
    return select ? { select } : {};
  }

  private safeSort(sort: string | undefined, sortDir: string | undefined) {
    if (!sort) return undefined;
    if (this.listSelect && !(sort in this.listSelect)) return undefined;
    return buildSort(sort, sortDir);
  }

  private async decorate(rows: any[], op: ReadOp): Promise<any[]> {
    const hook = this.config.hooks?.afterRead;
    if (!hook) return rows;
    return Promise.all(
      rows.map((row) => hook(row, { prisma: this.prisma, op })),
    );
  }

  private async decorateOne(row: any, op: ReadOp): Promise<any> {
    const hook = this.config.hooks?.afterRead;
    return hook ? hook(row, { prisma: this.prisma, op }) : row;
  }

  /**
   * Fetch a paginated, sorted, and filtered list of records.
   * Sub-resource counts are merged onto each row; calculated columns are resolved via raw SQL.
   */
  async findAll(params: RequestDto): Promise<T[]> {
    const subResources = this.config.subResources ?? [];
    const projection = this.projection('findAll');

    let query: Record<string, any> = {
      where: this.buildWhere(params.filter),
      take: params.pageSize,
      skip: (params as any).offset ?? (params.page - 1) * params.pageSize,
      orderBy: this.safeSort(params.sort, params.sortDir),
    };

    if (subResources.length) {
      const countClause = {
        select: Object.fromEntries(subResources.map((s) => [s.relation, true])),
      };
      if (projection.select) {
        query.select = { ...projection.select, _count: countClause };
      } else {
        query = { ...query, _count: countClause };
      }
    } else {
      Object.assign(query, projection);
    }

    const rows = await this.prismaModel.findMany(query);

    const mapped = subResources.length
      ? rows.map((row: any) => {
          const { _count, ...rest } = row;
          if (!_count) return rest;
          const counts = Object.fromEntries(
            subResources.map((s) => [s.column, _count[s.relation] ?? 0]),
          );
          return { ...rest, ...counts };
        })
      : rows;

    const withCalc = await mergeCalculatedColumnsForRows(
      mapped,
      this.config.calculatedColumns ?? [],
      this.config.model,
      this.prisma,
    );
    return this.decorate(withCalc, 'findAll');
  }

  /** Count records matching the given filter strings. */
  count(filter: string[]): Promise<number> {
    return this.prismaModel.count({ where: this.buildWhere(filter) });
  }

  /**
   * Fetch a single record by id.
   * Sub-resources with `includeInFindOne: true` are eagerly loaded.
   * @throws {NotFoundException} When no record exists for the given id.
   */
  async findOne(id: number | string): Promise<T> {
    const formIncludes = (this.config.subResources ?? [])
      .filter((s) => s.includeInFindOne)
      .map((s) => s.relation);

    const projection = this.projection('findOne');
    const idField = this.config.idField ?? 'id';
    const query: Record<string, any> = {
      where: { [idField]: this.toId(id) },
      ...projection,
    };

    if (formIncludes.length) {
      const includeClause = Object.fromEntries(
        formIncludes.map((r) => [r, true]),
      );
      if (projection.select) {
        query.select = { ...projection.select, ...includeClause };
      } else {
        query.include = includeClause;
      }
    }

    const record = await this.prismaModel.findUnique(query);
    if (!record)
      throw new NotFoundException(
        `${this.config.name} with id ${id} not found`,
      );
    const [withCalc] = await mergeCalculatedColumnsForRows(
      [record],
      this.config.calculatedColumns ?? [],
      this.config.model,
      this.prisma,
    );
    return this.decorateOne(withCalc ?? record, 'findOne');
  }

  /**
   * Fetch a paginated list of child records belonging to the given parent.
   * @param childRoute - Matches the `childRoute` key on a `SubResourceConfig`.
   * @throws {Error} When no matching sub-resource config or Prisma model is found.
   */
  async findAllByParent(
    parentId: string | number,
    childRoute: string,
    params: RequestDto,
  ): Promise<{ data: T[]; count: number }> {
    const sub = (this.config.subResources ?? []).find(
      (s) => s.childRoute === childRoute,
    );
    if (!sub)
      throw new Error(
        `No sub-resource "${childRoute}" on "${this.config.name}"`,
      );

    const childModel = this.prisma[sub.childModel];
    if (!childModel)
      throw new Error(`Prisma model "${sub.childModel}" not found`);

    const where = {
      ...this.buildWhere(params.filter),
      [sub.foreignKey]: this.toId(parentId),
    };
    const includeClause = buildIncludeClause(sub.include);

    const [data, count] = await Promise.all([
      childModel.findMany({
        where,
        take: params.pageSize,
        skip: (params as any).offset ?? (params.page - 1) * params.pageSize,
        orderBy: params.sort
          ? buildChildSortClause(params.sort, params.sortDir)
          : undefined,
        ...(includeClause && { include: includeClause }),
      }),
      childModel.count({ where }),
    ]);

    const withCalc = sub.calculatedColumns?.length
      ? await mergeCalculatedColumnsForRows(
          data,
          sub.calculatedColumns,
          sub.childModel,
          this.prisma,
        )
      : data;

    const decorated = sub.hooks?.afterRead
      ? await Promise.all(
          withCalc.map((row: any) =>
            sub.hooks!.afterRead!(row, { prisma: this.prisma, op: 'findAll' }),
          ),
        )
      : withCalc;

    return { data: decorated, count };
  }

  /**
   * Fetch a single child record. When `parentId` is supplied the query also filters by the foreign key.
   * @throws {NotFoundException} When no matching record is found.
   */
  async findOneChild(
    sub: SubResourceConfig,
    childId: string | number,
    parentId?: string | number,
  ): Promise<any> {
    const childModel = this.prisma[sub.childModel];
    if (!childModel)
      throw new Error(`Prisma model "${sub.childModel}" not found`);

    const id =
      (sub.idType ?? 'string') === 'number' ? +childId : String(childId);
    const idField = sub.idField ?? 'id';
    const where: Record<string, unknown> = { [idField]: id };
    if (parentId !== undefined) where[sub.foreignKey] = this.toId(parentId);

    const includeClause = buildIncludeClause(sub.include);
    const record = await childModel.findFirst({
      where,
      ...(includeClause && { include: includeClause }),
    });
    if (!record)
      throw new NotFoundException(
        `${sub.childRoute} with id ${childId} not found`,
      );
    if (sub.hooks?.afterRead)
      return sub.hooks.afterRead(record, {
        prisma: this.prisma,
        op: 'findOne',
      });
    return record;
  }
}
