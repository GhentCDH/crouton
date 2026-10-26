import { BadRequestException, NotFoundException } from '@nestjs/common';

import {
  type JsonColumn,
  type ListRequest,
  allowedIncludes,
  buildSort,
  offsetOf,
  resolveIncludeToRelationField,
} from '@ghentcdh/crouton-core';

import {
  childCtx,
  childRepositoryFn,
} from '../custom-repository/child-delegate';
import type { DataSourceAdapter } from './adapter/data-source.adapter';
import { type Resource } from '../resource/ResourceConfig.schema';
import { type SubResourceConfig } from '../resource/SubResource.schema';
import type { ResourceConfigRegistry } from '../resource-config.registry';
import { resolveValueLabelColumns } from './middleware/translation';
import { applyValueLabelColumns } from './middleware/value-label.apply';
import { buildFilterWhere, buildNestedPath, parseFilterString } from './query/filter';
import { orderableChildSort, sanitizeValueLabelSort } from './query/sort';
import {
  buildChildSortClause,
  buildFindOneIncludes,
  buildIncludeClause,
  mergeCalculatedColumnsForRows,
} from './query/sql.helpers';

// Re-exported for backwards compatibility
export { buildFilterWhere, parseFilterString } from './query/filter';
export { orderableChildSort, sanitizeValueLabelSort } from './query/sort';
export { applyValueLabelColumns };

/**
 * Handles all read operations for a resource — list, count, detail, and sub-resource queries.
 * Pure data access: hooks and valueLabel decoration are applied by the factory wrapper.
 *
 * Constructed by `createCrudRepository`; instantiate directly only in tests.
 *
 * @param prismaModel - The Prisma delegate for the resource's model (e.g. `prisma.text`).
 * @param adapter - The datasource adapter; `adapter.client` is the raw PrismaClient.
 * @param config - Resource config including model name, idType, hooks, and sub-resources.
 * @param listSelect - Prisma `select` clause for list queries, derived from the `findAll` schema. `undefined` = select all.
 * @param oneSelect - Prisma `select` clause for detail queries. Falls back to `listSelect` when absent.
 */
export class ReadRepository<T = any> {
  private get prisma(): any {
    return this.adapter.client;
  }

  constructor(
    private readonly prismaModel: any,
    private readonly adapter: DataSourceAdapter,
    private readonly config: Resource,
    private readonly listSelect: Record<string, any> | undefined,
    private readonly oneSelect: Record<string, any> | undefined,
    private readonly configRegistry?: ResourceConfigRegistry,
  ) {}

  /**
   * Physical table name for raw SQL (calculated columns).
   *
   * `table` overrides `model` for a `@@map`-ed Prisma model. Empty for a custom
   * resource, which cannot have calculated columns.
   */
  private get tableName(): string {
    return this.config.table ?? this.config.model ?? '';
  }

  private toId(id: string | number): string | number {
    return (this.config.idType ?? 'string') === 'number' ? +id : String(id);
  }

  private buildWhere(filter: string[] | undefined) {
    if (!filter?.length) return undefined;
    const manyToOneSubs = (this.config.subResources ?? []).filter(
      (s) => s.relationType === 'manyToOne' && s.displayKey,
    );
    const manyToOneCols = (
      (this.config.columns as unknown as JsonColumn[] | undefined) ?? []
    ).filter((c) => c.fieldInput?.relationType === 'manyToOne' && c.displayKey);
    const needsRemap = manyToOneSubs.length || manyToOneCols.length;
    const remapped = needsRemap
      ? filter.map((f) => {
          const parsed = parseFilterString(f);
          if (!parsed) return f;
          const sub = manyToOneSubs.find((s) => s.column === parsed.field);
          if (sub?.displayKey) {
            return `${parsed.field}.${sub.displayKey}:${parsed.value}:${parsed.operator}`;
          }
          const col = manyToOneCols.find((c) => c.id === parsed.field);
          if (col?.displayKey) {
            return `${parsed.field}.${col.displayKey}:${parsed.value}:${parsed.operator}`;
          }
          return f;
        })
      : filter;
    return buildFilterWhere(remapped);
  }

  private projection(op: 'findAll' | 'findOne') {
    const select = op === 'findAll' ? this.listSelect : this.oneSelect;
    return select ? { select } : {};
  }

  private safeSort(sort: string | undefined, sortDir: string | undefined) {
    if (!sort) return undefined;
    if (this.listSelect && !(sort.split('.')[0] in this.listSelect))
      return undefined;
    return buildSort(sort, sortDir);
  }

  /**
   * The parent a *child* read is scoped to, for the hook context.
   *
   * A sub-resource is served by the parent's controller, so its parent id arrives
   * as the parent's own `:id` — hence `param: 'id'`. `undefined` when no parent id
   * was supplied, so a hook is never handed a fabricated one.
   */
  private parentHookContext(parentId: string | number | undefined) {
    if (parentId === undefined || parentId === null || parentId === '') {
      return undefined;
    }
    return {
      route: this.config.route,
      param: 'id',
      id: this.toId(parentId),
    };
  }

  /**
   * Fetch a paginated, sorted, and filtered list of records.
   * Sub-resource counts are merged onto each row; calculated columns are resolved via raw SQL.
   * Resource-level `afterRead` and valueLabel decoration are NOT applied here — the
   * factory wrapper handles them so both Prisma and custom adapters use the same path.
   */
  async findAll(params: ListRequest, request?: any): Promise<T[]> {
    const subResources = this.config.subResources ?? [];
    const projection = this.projection('findAll');

    const vlCols = await resolveValueLabelColumns(
      this.config.route,
      this.config.valueLabelColumns,
      this.configRegistry,
    );
    const filterWhere = this.buildWhere(params.filter);
    const searchWhere = this.buildSearchOrWhere((params as any).q);
    const where =
      filterWhere && searchWhere
        ? { AND: [filterWhere, searchWhere] }
        : (filterWhere ?? searchWhere);
    const query: Record<string, any> = {
      where,
      take: params.pageSize,
      skip: offsetOf(params),
      orderBy: this.safeSort(
        sanitizeValueLabelSort(params.sort, vlCols),
        params.sortDir,
      ),
    };

    // A `kind: "custom"` child is served by its own repository.ts and has no
    // Prisma relation of that name, so it must stay out of every Prisma-shaped
    // clause below — `_count`, `include`, and the configInclude filter alike.
    // Asking for a relation the model does not have fails the whole query.
    const prismaSubResources = subResources.filter(
      (s) => s.childKind !== 'custom',
    );

    const oneToManySubResources = prismaSubResources.filter(
      (s) => s.relationType !== 'manyToOne',
    );

    // The count fills a table cell, so a column the table never renders does not
    // need one. Skipping it keeps `_count` off the query entirely when every
    // relation is hidden.
    const countableSubResources = oneToManySubResources.filter(
      (s) => !s.hiddenInTable,
    );

    // Include manyToOne relations (e.g. author) so they appear in list view.
    const manyToOneIncludes = prismaSubResources
      .filter((s) => s.relationType === 'manyToOne')
      .map((s) => s.relation);
    const flatIncludes = manyToOneIncludes.length
      ? Object.fromEntries(manyToOneIncludes.map((r) => [r, true]))
      : undefined;

    const requestedIncludes: string[] = params.include ?? [];
    let dynamicPrismaFields: string[] = [];
    if (requestedIncludes.length) {
      const nested = requestedIncludes.filter((v) => v.includes('.'));
      if (nested.length) {
        throw new BadRequestException(
          `Nested includes are not supported: ${nested.join(', ')}`,
        );
      }
      const columns = ((this.config as any).columns as JsonColumn[]) ?? [];
      const allowed = allowedIncludes(columns);
      const unknown = requestedIncludes.filter((v) => !allowed.includes(v));
      if (unknown.length) {
        throw new BadRequestException({
          message: `Unknown or forbidden include: ${unknown.join(', ')}`,
          allowed,
        });
      }
      dynamicPrismaFields = requestedIncludes.map((id) =>
        resolveIncludeToRelationField(id, columns),
      );
    }

    const allStaticAndDynamic = [
      ...(this.config.include ?? []),
      ...dynamicPrismaFields,
    ];
    const configInclude = buildIncludeClause(
      allStaticAndDynamic.length ? allStaticAndDynamic : undefined,
    );
    // Exclude every oneToMany sub-resource from configInclude in findAll: a
    // counted one would have its records overwritten by the count mapping below,
    // and an uncounted one is hidden from the table, so fetching whole child rows
    // per page would be cost for nothing. Deliberately not narrowed to the
    // counted set — that would silently turn a `_count` into a full child fetch
    // the moment a column is hidden.
    // Custom children join this set too: they cannot be Prisma-included at all,
    // so an entry naming one in `config.include` has to be dropped rather than
    // passed through to fail the query.
    const countableRelations = new Set([
      ...oneToManySubResources.map((s) => s.relation),
      ...subResources
        .filter((s) => s.childKind === 'custom')
        .map((s) => s.relation),
    ]);
    const filteredConfigInclude = configInclude
      ? Object.fromEntries(
          Object.entries(configInclude).filter(
            ([key]) => !countableRelations.has(key),
          ),
        )
      : undefined;
    const safeConfigInclude =
      filteredConfigInclude && Object.keys(filteredConfigInclude).length
        ? filteredConfigInclude
        : undefined;
    const mergedInclude =
      flatIncludes || safeConfigInclude
        ? { ...flatIncludes, ...safeConfigInclude }
        : undefined;

    const countClause = countableSubResources.length
      ? {
          select: Object.fromEntries(
            countableSubResources.map((s) => [s.relation, true]),
          ),
        }
      : undefined;

    if (projection.select) {
      query.select = {
        ...projection.select,
        ...(countClause && { _count: countClause }),
        ...mergedInclude,
      };
    } else {
      const includeClause = {
        ...(mergedInclude ?? {}),
        ...(countClause ? { _count: countClause } : {}),
      };
      if (Object.keys(includeClause).length) query.include = includeClause;
    }

    const rows = await this.prismaModel.findMany(query);

    const mapped = countableSubResources.length
      ? rows.map((row: any) => {
          const { _count, ...rest } = row;
          if (!_count) return rest;
          const counts = Object.fromEntries(
            countableSubResources.map((s) => [
              s.column,
              _count[s.relation] ?? 0,
            ]),
          );
          return { ...rest, ...counts };
        })
      : rows;

    const withCalc = await mergeCalculatedColumnsForRows(
      mapped,
      this.config.calculatedColumns ?? [],
      this.tableName,
      this.prisma,
      this.config.idField ?? 'id',
      this.adapter.provider,
    );
    // Resource-level afterRead + valueLabel decoration is applied by the factory wrapper.
    return withCalc;
  }

  private buildSearchOrWhere(
    q: string | undefined,
  ): Record<string, unknown> | undefined {
    const search = (this.config as any).search as string[] | undefined;
    if (!q || !search?.length) return undefined;
    return {
      OR: search.map((path) =>
        buildNestedPath(path.split('.'), { contains: q }),
      ),
    };
  }

  /** Count records matching the given filter strings and optional free-text search. */
  count(filter: string[], q?: string): Promise<number> {
    const filterWhere = this.buildWhere(filter);
    const searchWhere = this.buildSearchOrWhere(q);
    const where =
      filterWhere && searchWhere
        ? { AND: [filterWhere, searchWhere] }
        : (filterWhere ?? searchWhere);
    return this.prismaModel.count({ where });
  }

  /**
   * Fetch a single record by id.
   * Sub-resources with `includeInFindOne: true` are eagerly loaded (flat).
   * `config.include` entries are loaded with full nesting via `buildIncludeClause`.
   * Resource-level `afterRead` decoration is applied by the factory wrapper.
   * @throws {NotFoundException} When no record exists for the given id.
   */
  async findOne(id: number | string, request?: any): Promise<T> {
    const projection = this.projection('findOne');
    const idField = this.config.idField ?? 'id';
    const query: Record<string, any> = {
      where: { [idField]: this.toId(id) },
      ...projection,
    };

    const rawInclude = (request as any)?.query?.include;
    const requestedIncludes: string[] = rawInclude
      ? (Array.isArray(rawInclude) ? rawInclude : [rawInclude]).flatMap(
          (s: string) => s.split(',').map((v) => v.trim()).filter(Boolean),
        )
      : [];
    let dynamicPrismaFields: string[] = [];
    if (requestedIncludes.length) {
      const nested = requestedIncludes.filter((v) => v.includes('.'));
      if (nested.length) {
        throw new BadRequestException(
          `Nested includes are not supported: ${nested.join(', ')}`,
        );
      }
      const columns = ((this.config as any).columns as JsonColumn[]) ?? [];
      const allowed = allowedIncludes(columns);
      const unknown = requestedIncludes.filter((v) => !allowed.includes(v));
      if (unknown.length) {
        throw new BadRequestException({
          message: `Unknown or forbidden include: ${unknown.join(', ')}`,
          allowed,
        });
      }
      dynamicPrismaFields = requestedIncludes.map((colId) =>
        resolveIncludeToRelationField(colId, columns),
      );
    }

    const allStaticAndDynamic = [
      ...(this.config.findOneInclude ?? this.config.include ?? []),
      ...dynamicPrismaFields,
    ];
    const mergedInclude = buildFindOneIncludes(
      this.config.subResources ?? [],
      buildIncludeClause(allStaticAndDynamic.length ? allStaticAndDynamic : undefined),
    );

    if (mergedInclude) {
      if (projection.select) {
        query.select = { ...projection.select, ...mergedInclude };
      } else {
        query.include = mergedInclude;
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
      this.tableName,
      this.prisma,
      this.config.idField ?? 'id',
      this.adapter.provider,
    );

    // Enrich nested sub-resource arrays with their own calculated columns.
    // e.g. text.text_metadata items need metadata's calculatedColumns applied.
    let enriched: any = withCalc ?? record;
    for (const sub of this.config.subResources ?? []) {
      if (!sub.calculatedColumns?.length) continue;
      const nested = enriched[sub.relation];
      if (!Array.isArray(nested) || !nested.length) continue;
      const enrichedNested = await mergeCalculatedColumnsForRows(
        nested,
        sub.calculatedColumns,
        sub.childTable ?? sub.childModel,
        this.prisma,
        sub.idField ?? 'id',
        this.adapter.provider,
      );
      enriched = { ...enriched, [sub.relation]: enrichedNested };
    }

    // Resource-level afterRead decoration is applied by the factory wrapper.
    return enriched;
  }

  /**
   * Fetch a paginated list of child records belonging to the given parent.
   * @param childRoute - Matches the `childRoute` key on a `SubResourceConfig`.
   * @throws {Error} When no matching sub-resource config or Prisma model is found.
   */
  async findAllByParent(
    parentId: string | number,
    childRoute: string,
    params: ListRequest,
    request?: any,
  ): Promise<{ data: T[]; count: number }> {
    const sub = (this.config.subResources ?? []).find(
      (s) => s.childRoute === childRoute,
    );
    if (!sub)
      throw new Error(
        `No sub-resource "${childRoute}" on "${this.config.name}"`,
      );

    if (sub.childKind === 'custom') {
      const findAll = childRepositoryFn(sub, 'findAll', this.config.name);
      const result = await findAll(
        this.toId(parentId),
        params,
        childCtx({
          parentConfig: this.config,
          prisma: this.prisma,
          op: 'findAll',
          parentId: this.toId(parentId),
          params,
          request,
        }),
      );
      const rows = result?.data ?? [];
      const decorated = sub.hooks?.afterRead
        ? await Promise.all(
            rows.map((row: any) =>
              sub.hooks!.afterRead!(row, {
                dataSource: this.adapter,
                prisma: this.prisma,
                op: 'findAll',
                request,
                parent: this.parentHookContext(parentId),
              }),
            ),
          )
        : rows;
      const subVlCols = await resolveValueLabelColumns(
        this.config.route,
        sub.valueLabelColumns,
        this.configRegistry,
        sub.childRoute,
      );
      const labeled = subVlCols?.length
        ? decorated.map((r: any) => applyValueLabelColumns(r, subVlCols))
        : decorated;
      return { data: labeled, count: result?.count ?? labeled.length };
    }

    const childModel = this.prisma[sub.childModel];
    if (!childModel)
      throw new Error(`Prisma model "${sub.childModel}" not found`);

    const where = {
      ...this.buildWhere(params.filter),
      ...(sub.relationType !== 'manyToMany' && {
        [sub.foreignKey]: this.toId(parentId),
      }),
    };
    const includeClause = buildIncludeClause(sub.include);
    const subVlCols = await resolveValueLabelColumns(
      this.config.route,
      sub.valueLabelColumns,
      this.configRegistry,
      sub.childRoute,
    );
    const childSort = orderableChildSort(
      sanitizeValueLabelSort(params.sort, subVlCols),
      childModel,
      sub,
    );

    const [data, count] = await Promise.all([
      childModel.findMany({
        where,
        take: params.pageSize,
        skip: offsetOf(params),
        orderBy: childSort
          ? buildChildSortClause(childSort, params.sortDir)
          : undefined,
        ...(includeClause && { include: includeClause }),
      }),
      childModel.count({ where }),
    ]);

    const withCalc = sub.calculatedColumns?.length
      ? await mergeCalculatedColumnsForRows(
          data,
          sub.calculatedColumns,
          sub.childTable ?? sub.childModel,
          this.prisma,
          sub.idField ?? 'id',
          this.adapter.provider,
        )
      : data;

    const decorated = sub.hooks?.afterRead
      ? await Promise.all(
          withCalc.map((row: any) =>
            sub.hooks!.afterRead!(row, {
              dataSource: this.adapter,
              prisma: this.prisma,
              op: 'findAll',
              request,
              parent: this.parentHookContext(parentId),
            }),
          ),
        )
      : withCalc;

    const labeled = subVlCols?.length
      ? decorated.map((r: any) => applyValueLabelColumns(r, subVlCols))
      : decorated;
    return { data: labeled, count };
  }

  /**
   * Fetch a single child record. When `parentId` is supplied the query also filters by the foreign key.
   * @throws {NotFoundException} When no matching record is found.
   */
  async findOneChild(
    sub: SubResourceConfig,
    childId: string | number,
    parentId?: string | number,
    request?: any,
  ): Promise<any> {
    if (sub.childKind === 'custom') {
      if (parentId === undefined) {
        throw new BadRequestException(
          `Sub-resource "${sub.childRoute}" of "${this.config.name}" requires a parent id.`,
        );
      }
      const findOne = childRepositoryFn(sub, 'findOne', this.config.name);
      const row = await findOne(
        this.toId(parentId),
        (sub.idType ?? 'string') === 'number' ? +childId : String(childId),
        childCtx({
          parentConfig: this.config,
          prisma: this.prisma,
          op: 'findOne',
          parentId: this.toId(parentId),
          id: childId,
          request,
        }),
      );
      if (row === null || row === undefined) {
        throw new NotFoundException(
          `${sub.childRoute} with id ${childId} not found`,
        );
      }
      return sub.hooks?.afterRead
        ? sub.hooks.afterRead(row, {
            dataSource: this.adapter,
            prisma: this.prisma,
            op: 'findOne',
            request,
            parent: this.parentHookContext(parentId),
          })
        : row;
    }

    const childModel = this.prisma[sub.childModel];
    if (!childModel)
      throw new Error(`Prisma model "${sub.childModel}" not found`);

    const id =
      (sub.idType ?? 'string') === 'number' ? +childId : String(childId);
    const idField = sub.idField ?? 'id';
    const where: Record<string, unknown> = { [idField]: id };
    if (parentId !== undefined && sub.relationType !== 'manyToMany')
      where[sub.foreignKey] = this.toId(parentId);

    const includeClause = buildIncludeClause(sub.include);
    const record = await childModel.findFirst({
      where,
      ...(includeClause && { include: includeClause }),
    });
    if (!record)
      throw new NotFoundException(
        `${sub.childRoute} with id ${childId} not found`,
      );

    const [withCalc] = sub.calculatedColumns?.length
      ? await mergeCalculatedColumnsForRows(
          [record],
          sub.calculatedColumns,
          sub.childTable ?? sub.childModel,
          this.prisma,
          sub.idField ?? 'id',
          this.adapter.provider,
        )
      : [record];

    // findOne (single child) keeps the scalar — see decorateOne.
    if (sub.hooks?.afterRead)
      return sub.hooks.afterRead(withCalc, {
        dataSource: this.adapter,
        prisma: this.prisma,
        op: 'findOne',
        request,
        parent: this.parentHookContext(parentId),
      });
    return withCalc;
  }
}
