import { NotFoundException } from '@nestjs/common';

import {
  Operator,
  type OperatorType,
  buildSort,
  toValueLabel,
} from '@ghentcdh/crouton-core';

import { type ReadOp } from './hooks';
import type { RequestDto } from './request.dto';
import { type Resource } from './resource/ResourceConfig.schema';
import { type SubResourceConfig } from './resource/SubResource.schema';
import { type ValueLabelColumn } from './resource/valueLabel';
import {
  buildChildSortClause,
  buildIncludeClause,
  mergeCalculatedColumnsForRows,
} from './sql.helpers';

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

  const value = hasOperator
    ? parts.slice(1, -1).join(':')
    : parts.slice(1).join(':');
  const operator: OperatorType = hasOperator
    ? (lastPart as OperatorType)
    : 'contains';

  return { field, value, operator };
};

/**
 * Build a nested Prisma condition object from a dot-separated field path.
 * `"author.name"` → `{ author: { name: condition } }`
 */
const buildNestedPath = (
  path: string[],
  condition: unknown,
): Record<string, unknown> => {
  if (path.length === 1) return { [path[0]]: condition };
  const [head, ...rest] = path;
  return { [head]: buildNestedPath(rest, condition) };
};

/**
 * Separator marking a JSON (jsonb) column path in a filter key.
 * `"date_range->from"` targets the `from` key inside the `date_range` json column.
 */
const JSON_PATH_SEP = '->';

const isJsonPath = (field: string): boolean => field.includes(JSON_PATH_SEP);

/**
 * Build a Prisma JSON-filter `where` fragment for a jsonb sub-path, e.g.
 * `date_range->from` + `gt` → `{ date_range: { path: ['from'], gt: value } }`.
 *
 * Values are kept as strings: ISO-8601 dates compare lexicographically, which
 * is the same as chronological order, so no casting is needed for `gt`/`lt`.
 * Returns `null` for operators that have no meaningful JSON-path mapping.
 */
const buildJsonPathCondition = (
  field: string,
  value: string,
  operator: OperatorType,
): Record<string, unknown> | null => {
  const [column, ...path] = field.split(JSON_PATH_SEP);
  if (!column || path.length === 0) return null;
  const frag = (extra: Record<string, unknown>) => ({
    [column]: { path, ...extra },
  });

  switch (operator) {
    case 'equals':
      return frag({ equals: value });
    case 'not_equals':
      return frag({ not: value });
    case 'gt':
      return frag({ gt: value });
    case 'lt':
      return frag({ lt: value });
    case 'contains':
      return frag({ string_contains: value });
    case 'not_contains':
      return { NOT: frag({ string_contains: value }) };
    // isnull/isnotnull on a json sub-path are not supported — filter on the
    // whole column instead if you need an emptiness check.
    default:
      return null;
  }
};

/**
 * Map a parsed operator + value to a Prisma field condition.
 * Numeric coercion is applied for `gt` and `lt`.
 */
const operatorToCondition = (
  value: string,
  operator: OperatorType,
): unknown => {
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
    default:
      return undefined;
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
      isJsonPath(field)
        ? buildJsonPathCondition(field, value, operator)
        : buildNestedPath(
            field.split('.'),
            operatorToCondition(value, operator),
          ),
    )
    .filter((c): c is Record<string, unknown> => c !== null);

  return conditions.length ? { AND: conditions } : undefined;
};

/**
 * Drop a trailing `.label` from a sort path when it targets a value-label
 * column — the label is a serialization envelope, not a DB field, so sorting
 * must fall back to the underlying scalar (e.g. `text_type.label` → `text_type`,
 * `author.origin.label` → `author.origin`). Real columns named `label` are not
 * affected: only paths whose value-label field sits right before `.label`.
 */
export const sanitizeValueLabelSort = (
  sort: string | undefined,
  cols: ValueLabelColumn[] | undefined,
): string | undefined => {
  if (!sort || !cols?.length || !sort.endsWith('.label')) return sort;
  const base = sort.slice(0, -'.label'.length);
  const leaf = base.split('.').pop();
  return cols.some((c) => c.field === base || c.field === leaf) ? base : sort;
};

/**
 * Sanitize a sub-resource `orderBy` field so Prisma never rejects it:
 *
 * - A nested path (`author.origin_name`) is kept as-is — Prisma builds a nested
 *   `orderBy` and validates the leaf against the related model.
 * - A single segment must be a real **scalar/enum** field of the child model
 *   (the Prisma field-reference API, `model.fields`, lists exactly those — not
 *   object relations). A bare relation name (`author`) or a computed/aliased
 *   column id is NOT orderable on its own and would throw
 *   (`Expected …OrderByWithRelationInput, provided String`), so it is dropped.
 * - This also covers join tables (composite PK, no `id`): the frontend's default
 *   `id` isn't a scalar field, so it's dropped instead of crashing.
 *
 * When the model exposes no field metadata we can't validate, so we trust the
 * caller (e.g. mocked models in tests).
 */
export const orderableChildSort = (
  sort: string | undefined,
  childModel: any,
  _sub: SubResourceConfig,
): string | undefined => {
  if (!sort) return undefined;
  const scalarFields = new Set(
    Object.keys((childModel?.fields ?? {}) as Record<string, unknown>),
  );
  if (scalarFields.size === 0) return sort; // no metadata → trust the caller
  // Nested relation path: Prisma builds a valid nested orderBy.
  if (sort.includes('.')) return sort;
  // Single segment must be an orderable scalar/enum field of the child.
  return scalarFields.has(sort) ? sort : undefined;
};

/** Wrap configured columns of a row as `{ value, label }`. Returns a shallow copy. */
export const applyValueLabelColumns = (
  row: any,
  cols: ValueLabelColumn[] | undefined,
): any => {
  if (!row || !cols?.length) return row;
  const out = { ...row };
  for (const { field, values } of cols) {
    if (field in out) out[field] = toValueLabel(out[field], values);
  }
  return out;
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
    private readonly config: Resource,
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
    const hooked = hook
      ? await Promise.all(
          rows.map((row) => hook(row, { prisma: this.prisma, op })),
        )
      : rows;
    const cols = this.config.valueLabelColumns;
    return cols?.length
      ? hooked.map((r) => applyValueLabelColumns(r, cols))
      : hooked;
  }

  private async decorateOne(row: any, op: ReadOp): Promise<any> {
    // Note: the `{ value, label }` envelope is applied on list reads only.
    // findOne feeds the form/detail view, where the select control maps the
    // stored scalar to its label itself and submits the scalar back.
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
      orderBy: this.safeSort(
        sanitizeValueLabelSort(params.sort, this.config.valueLabelColumns),
        params.sortDir,
      ),
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
   * Sub-resources with `includeInFindOne: true` are eagerly loaded (flat).
   * `config.include` entries are loaded with full nesting via `buildIncludeClause`.
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

    // Merge flat sub-resource includes (includeInFindOne) with nested config.include
    const flatIncludes = formIncludes.length
      ? Object.fromEntries(formIncludes.map((r) => [r, true]))
      : undefined;
    const configInclude = buildIncludeClause(this.config.include);
    const mergedInclude =
      flatIncludes || configInclude
        ? { ...flatIncludes, ...configInclude }
        : undefined;

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
      this.config.model,
      this.prisma,
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
        sub.childModel,
        this.prisma,
      );
      enriched = { ...enriched, [sub.relation]: enrichedNested };
    }

    return this.decorateOne(enriched, 'findOne');
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
    const childSort = orderableChildSort(
      sanitizeValueLabelSort(params.sort, sub.valueLabelColumns),
      childModel,
      sub,
    );

    const [data, count] = await Promise.all([
      childModel.findMany({
        where,
        take: params.pageSize,
        skip: (params as any).offset ?? (params.page - 1) * params.pageSize,
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

    const labeled = sub.valueLabelColumns?.length
      ? decorated.map((r: any) =>
          applyValueLabelColumns(r, sub.valueLabelColumns),
        )
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

    const [withCalc] = sub.calculatedColumns?.length
      ? await mergeCalculatedColumnsForRows(
          [record],
          sub.calculatedColumns,
          sub.childModel,
          this.prisma,
        )
      : [record];

    // findOne (single child) keeps the scalar — see decorateOne.
    if (sub.hooks?.afterRead)
      return sub.hooks.afterRead(withCalc, {
        prisma: this.prisma,
        op: 'findOne',
      });
    return withCalc;
  }
}
