import type { ListRequest } from '@ghentcdh/crouton-core';

import { resolveDefinition, schemaFor } from './crud.config';
import {
  type DataSourceResolver,
  createCustomRepository,
} from './custom-repository';
import type { DataSourceAdapter } from './data-source/data-source.adapter';
import { PrismaDataSourceAdapter } from './data-source/prisma.adapter';
import { decorateRow, decorateRows, postWrite, prepareWrite } from './hooks';
import { ReadRepository } from './read.repository';
import { type Resource } from './resource/ResourceConfig.schema';
import { type SubResourceConfig } from './resource/SubResource.schema';
import type { ResourceConfigRegistry } from './resource-config.registry';
import { toSelectFields } from './schema.utils';
import { resolveValueLabelColumns } from './translation';
import { WriteRepository, stripSubResourceKeys } from './write.repository';

/** Unified read/write interface for a CRUD resource, combining `ReadRepository` and `WriteRepository`. */
export interface CrudRepository<T = any> {
  /** Raw Prisma client — used by action procedures. */
  readonly prisma: any;
  findAll(params: ListRequest, request?: any): Promise<T[]>;
  count(filter: string[]): Promise<number>;
  /**
   * Fetch rows *and* their total count in a single call.
   *
   * Optional: the Prisma-backed repository leaves it undefined and callers fall
   * back to `findAll` + `count`. Repositories whose backend cannot count
   * separately (e.g. a remote HTTP API returning `{items, total}`) implement
   * this instead.
   */
  findAllWithCount?(
    params: ListRequest,
    request?: any,
  ): Promise<{ data: T[]; count: number }>;
  findOne(id: number | string, request?: any): Promise<T>;
  findAllByParent(
    parentId: string | number,
    childRoute: string,
    params: ListRequest,
    request?: any,
  ): Promise<{ data: T[]; count: number }>;
  findOneChild(
    sub: SubResourceConfig,
    childId: string | number,
    parentId?: string | number,
    request?: any,
  ): Promise<T>;
  createChild(
    parentId: string | number,
    sub: SubResourceConfig,
    data: unknown,
    request?: any,
  ): Promise<T>;
  updateChild(
    sub: SubResourceConfig,
    childId: string | number,
    data: unknown,
    request?: any,
  ): Promise<T>;
  deleteChild(
    sub: SubResourceConfig,
    childId: string | number,
    parentId?: string | number,
    request?: any,
  ): Promise<T>;
  create(data: unknown, request?: any): Promise<T>;
  update(id: number | string, data: unknown, request?: any): Promise<T>;
  patch(id: number | string, data: unknown, request?: any): Promise<T>;
  upsert(data: unknown, request?: any): Promise<T>;
  upsertMany(rows: unknown[], request?: any): Promise<T[]>;
  delete(id: number | string, request?: any): Promise<T>;
}

/**
 * Construct a `CrudRepository` by wiring a `ReadRepository` and `WriteRepository` together.
 *
 * The `findAll`/`findOne` schemas are used to derive Prisma `select` clauses so only the
 * columns the view needs are fetched.
 *
 * A `kind: "custom"` resource short-circuits to `createCustomRepository`, which
 * delegates to the user's `repository.ts`.
 *
 * Resource-level hooks (`beforeWrite`/`afterWrite`/`afterRead`) and valueLabel
 * decoration are applied here in the factory wrapper — the repositories perform
 * pure data access so both Prisma and custom adapters share the same hook path.
 *
 * @param prisma - Full PrismaClient instance (may be `undefined` for a custom
 *   resource in a project with no datasources).
 * @param config - Resource config. `config.model` must match a key on the PrismaClient.
 * @throws {Error} When `config.model` is not found on the provided PrismaClient.
 */
export function createCrudRepository<T = any>(
  prisma: any,
  config: Resource,
  dataSources?: DataSourceResolver,
  configRegistry?: ResourceConfigRegistry,
): CrudRepository<T> {
  // A custom resource brings its own data access; everything below this point
  // assumes a Prisma delegate.
  if (config.kind === 'custom') {
    return createCustomRepository<T>(
      prisma,
      config,
      dataSources ?? {
        resolve: () => prisma,
        entries: () => [],
      },
      config.repository,
      configRegistry,
    );
  }

  if (!config.model) {
    throw new Error(
      `Resource "${config.name}" has no "model". A prisma-backed resource must ` +
        'name its Prisma model; set "kind": "custom" for a resource with no model.',
    );
  }
  const model = prisma[config.model];
  if (!model) {
    throw new Error(
      `Model "${config.model}" not found on the provided PrismaClient. ` +
        `Check the resource config for "${config.name}".`,
    );
  }

  const definition = resolveDefinition(config);
  const listSchema = schemaFor(definition, 'findAll');
  const oneSchema = schemaFor(definition, 'findOne');
  const listSelect = listSchema ? toSelectFields(listSchema) : undefined;
  const oneSelect = oneSchema ? toSelectFields(oneSchema) : listSelect;

  // Wrap the raw prisma client in an adapter so hooks receive a `DataSourceAdapter`.
  const adapter: DataSourceAdapter = new PrismaDataSourceAdapter(prisma);

  const reader = new ReadRepository<T>(
    model,
    adapter,
    config,
    listSelect,
    oneSelect,
    configRegistry,
  );
  const writer = new WriteRepository<T>(model, adapter, config);

  // ── Resource-level decoration helpers ────────────────────────────────────
  // These mirror the removed ReadRepository.decorate / decorateOne methods,
  // moved here so both Prisma and custom adapters share the same hook path.

  const decorateFindAll = async (rows: any[], request?: any): Promise<any[]> => {
    const vlCols = await resolveValueLabelColumns(
      config.route,
      config.valueLabelColumns,
      configRegistry,
    );
    const target =
      vlCols === config.valueLabelColumns
        ? config
        : { hooks: config.hooks, valueLabelColumns: vlCols };
    return decorateRows(rows, 'findAll', target, adapter, request);
  };

  const decorateFindOne = (row: any, request?: any): Promise<any> =>
    decorateRow(row, 'findOne', config, adapter, request);

  const prepareData = (
    data: unknown,
    op: 'create' | 'update' | 'patch',
    id?: string | number,
    request?: any,
  ) => prepareWrite(data, op, config, adapter, id, request);

  const postData = (
    result: any,
    op: 'create' | 'update' | 'patch' | 'delete',
    id?: string | number,
    request?: any,
  ) => postWrite(result, op, config, adapter, id, request);

  const toId = (id: string | number): string | number =>
    (config.idType ?? 'string') === 'number' ? +id : String(id);

  return {
    prisma,
    findAll: async (params, request) =>
      decorateFindAll(await reader.findAll(params, request), request),
    count: reader.count.bind(reader),
    findOne: async (id, request) =>
      decorateFindOne(await reader.findOne(id, request), request),
    findAllByParent: reader.findAllByParent.bind(reader),
    findOneChild: reader.findOneChild.bind(reader),
    create: async (data, request) => {
      const stripped = stripSubResourceKeys(config, data);
      const prepared = await prepareData(stripped, 'create', undefined, request);
      const result = await writer.create(prepared, request);
      return postData(result, 'create', undefined, request);
    },
    update: async (id, data, request) => {
      const coercedId = toId(id);
      const stripped = stripSubResourceKeys(config, data);
      const prepared = await prepareData(stripped, 'update', coercedId, request);
      const result = await writer.update(id, prepared, request);
      return postData(result, 'update', coercedId, request);
    },
    patch: async (id, data, request) => {
      const coercedId = toId(id);
      const stripped = stripSubResourceKeys(config, data);
      const prepared = await prepareData(stripped, 'patch', coercedId, request);
      const result = await writer.patch(id, prepared, request);
      return postData(result, 'patch', coercedId, request);
    },
    upsert: writer.upsert.bind(writer),
    upsertMany: writer.upsertMany.bind(writer),
    delete: async (id, request) => {
      const coercedId = toId(id);
      const result = await writer.delete(id, request);
      return postData(result, 'delete', coercedId, request);
    },
    createChild: writer.createChild.bind(writer),
    updateChild: writer.updateChild.bind(writer),
    deleteChild: writer.deleteChild.bind(writer),
  };
}
