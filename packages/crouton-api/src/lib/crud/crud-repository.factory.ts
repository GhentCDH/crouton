import { NotFoundException } from '@nestjs/common';

import { type ListRequest, offsetOf } from '@ghentcdh/crouton-core';

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
  const fallbackDataSources: DataSourceResolver = dataSources ?? {
    resolve: () => prisma,
    entries: () => [],
  };

  // A per-resource repository.ts always takes precedence over the datasource adapter.
  if (config.repository) {
    return createCustomRepository<T>(
      prisma,
      config,
      fallbackDataSources,
      config.repository,
      configRegistry,
    );
  }

  const resolvedAdapter = dataSources?.resolveAdapter?.(config.database);

  // For kind:custom resources there is no Prisma model; use the resource name as the
  // model key passed to adapter methods so they can route to the right collection.
  const adapterModelKey = config.model ?? config.name;

  const definition = resolveDefinition(config);
  const listSchema = schemaFor(definition, 'findAll');
  const oneSchema = schemaFor(definition, 'findOne');
  const listSelect = listSchema ? toSelectFields(listSchema) : undefined;
  const oneSelect = oneSchema ? toSelectFields(oneSchema) : listSelect;

  // If the adapter exposes the CRUD surface, route through it regardless of adapter
  // kind or resource kind. Covers:
  //   - kind:prisma  + adapter:prisma  (PrismaDataSourceAdapter or subclass override)
  //   - kind:custom  + adapter:custom  (no repository.ts needed)
  //   - kind:prisma  + adapter:custom  (custom backend with generated schema)
  if (resolvedAdapter?.findAll && resolvedAdapter.count) {
    const baseCtx = { config, op: 'n/a', offset: 0, listSelect, oneSelect, configRegistry };
    const ctx = (request?: any, op = 'findAll', id?: string | number) => ({
      ...baseCtx, op, request, ...(id !== undefined && { id }),
    });

    const mkDecorateFindAll = (adapter: DataSourceAdapter) =>
      async (rows: any[], request?: any): Promise<any[]> => {
        const vlCols = await resolveValueLabelColumns(config.route, config.valueLabelColumns, configRegistry);
        const target = vlCols === config.valueLabelColumns ? config : { hooks: config.hooks, valueLabelColumns: vlCols };
        return decorateRows(rows, 'findAll', target, adapter, request);
      };
    const decorateFindAll = mkDecorateFindAll(resolvedAdapter);
    const decorateFindOne = (row: any, request?: any) => decorateRow(row, 'findOne', config, resolvedAdapter, request);
    const prepareData = (data: unknown, op: 'create'|'update'|'patch', id?: string|number, request?: any) =>
      prepareWrite(data, op, config, resolvedAdapter, id, request);
    const postData = (result: any, op: 'create'|'update'|'patch'|'delete', id?: string|number, request?: any) =>
      postWrite(result, op, config, resolvedAdapter, id, request);
    const toId = (id: string | number): string | number =>
      (config.idType ?? 'string') === 'number' ? +id : String(id);

    const adapterFindAllByParent = async (
      parentId: string | number,
      childRoute: string,
      params: ListRequest,
      request?: any,
    ): Promise<{ data: T[]; count: number }> => {
      if (resolvedAdapter.findAllByParent) {
        const sub = config.subResources?.find((s) => s.childRoute === childRoute);
        if (!sub) throw new Error(`No sub-resource "${childRoute}" on "${config.name}"`);
        return resolvedAdapter.findAllByParent(adapterModelKey, parentId, sub, params, ctx(request, 'findAll'));
      }
      // Fallback: only available when prisma model exists (Prisma adapter).
      if (!config.model) throw new Error(`Adapter for "${config.name}" does not implement findAllByParent`);
      const prismaModel = prisma[config.model];
      const reader = new ReadRepository<T>(prismaModel, resolvedAdapter, config, listSelect, oneSelect, configRegistry);
      return reader.findAllByParent(parentId, childRoute, params, request);
    };

    const adapterFindOneChild = async (
      sub: SubResourceConfig,
      childId: string | number,
      parentId?: string | number,
      request?: any,
    ): Promise<T> => {
      if (resolvedAdapter.findOneChild) {
        const row = await resolvedAdapter.findOneChild(adapterModelKey, sub, childId, parentId, ctx(request, 'findOne', childId));
        if (row === null || row === undefined) throw new NotFoundException(`${sub.childRoute} with id ${childId} not found`);
        return row;
      }
      if (!config.model) throw new Error(`Adapter for "${config.name}" does not implement findOneChild`);
      const prismaModel = prisma[config.model];
      const reader = new ReadRepository<T>(prismaModel, resolvedAdapter, config, listSelect, oneSelect, configRegistry);
      return reader.findOneChild(sub, childId, parentId, request);
    };

    const prismaModel = config.model ? prisma?.[config.model] : undefined;
    const writer = prismaModel ? new WriteRepository<T>(prismaModel, resolvedAdapter, config) : undefined;

    return {
      prisma,
      findAllWithCount: async (params, request) => {
        const { data, count } = await resolvedAdapter.findAll!(adapterModelKey, params, { ...ctx(request, 'findAll'), offset: offsetOf(params) });
        return { data: await decorateFindAll(data, request), count };
      },
      findAll: async (params, request) => {
        const { data } = await resolvedAdapter.findAll!(adapterModelKey, params, { ...ctx(request, 'findAll'), offset: offsetOf(params) });
        return decorateFindAll(data, request);
      },
      count: (filter) => resolvedAdapter.count!(adapterModelKey, filter, baseCtx),
      findOne: async (id, request) => {
        const row = await resolvedAdapter.findOne!(adapterModelKey, id, ctx(request, 'findOne', id));
        if (row === null || row === undefined) throw new NotFoundException(`${config.name} with id ${id} not found`);
        return decorateFindOne(row, request);
      },
      findAllByParent: adapterFindAllByParent,
      findOneChild: adapterFindOneChild,
      create: async (data, request) => {
        const stripped = stripSubResourceKeys(config, data);
        const prepared = await prepareData(stripped, 'create', undefined, request);
        const result = await resolvedAdapter.create!(adapterModelKey, prepared, ctx(request, 'create'));
        return postData(result, 'create', undefined, request);
      },
      update: async (id, data, request) => {
        const coercedId = toId(id);
        const stripped = stripSubResourceKeys(config, data);
        const prepared = await prepareData(stripped, 'update', coercedId, request);
        const result = await resolvedAdapter.update!(adapterModelKey, id, prepared, ctx(request, 'update', coercedId));
        return postData(result, 'update', coercedId, request);
      },
      patch: async (id, data, request) => {
        const coercedId = toId(id);
        const stripped = stripSubResourceKeys(config, data);
        const prepared = await prepareData(stripped, 'patch', coercedId, request);
        const result = await (resolvedAdapter.patch ?? resolvedAdapter.update)!(adapterModelKey, id, prepared, ctx(request, 'patch', coercedId));
        return postData(result, 'patch', coercedId, request);
      },
      upsert: writer
        ? writer.upsert.bind(writer)
        : () => Promise.reject(new Error(`upsert not supported for "${config.name}" (no Prisma model)`)),
      upsertMany: writer
        ? writer.upsertMany.bind(writer)
        : () => Promise.reject(new Error(`upsertMany not supported for "${config.name}" (no Prisma model)`)),
      delete: async (id, request) => {
        const coercedId = toId(id);
        const result = await resolvedAdapter.delete!(adapterModelKey, id, ctx(request, 'delete', coercedId));
        return postData(result, 'delete', coercedId, request);
      },
      createChild: writer
        ? writer.createChild.bind(writer)
        : () => Promise.reject(new Error(`createChild not supported for "${config.name}" (no Prisma model)`)),
      updateChild: writer
        ? writer.updateChild.bind(writer)
        : () => Promise.reject(new Error(`updateChild not supported for "${config.name}" (no Prisma model)`)),
      deleteChild: writer
        ? writer.deleteChild.bind(writer)
        : () => Promise.reject(new Error(`deleteChild not supported for "${config.name}" (no Prisma model)`)),
    };
  }

  // If non-prisma adapter has no CRUD surface, fall back to createCustomRepository
  // (requires adapter.client that implements ops, or a repository.ts was already handled above).
  if (resolvedAdapter && resolvedAdapter.kind !== 'prisma') {
    return createCustomRepository<T>(
      resolvedAdapter.client as any,
      config,
      fallbackDataSources,
      undefined,
      configRegistry,
    );
  }

  // ── Legacy Prisma path ────────────────────────────────────────────────────
  // Used when no registry is provided (unit tests, direct factory calls).
  // The resolved adapter path above covers all production scenarios.

  if (!config.model) {
    throw new Error(
      `Resource "${config.name}" has no "model". A prisma-backed resource must ` +
        'name its Prisma model, or point to a datasource with adapter: "custom".',
    );
  }
  const legacyModel = prisma[config.model];
  if (!legacyModel) {
    throw new Error(
      `Model "${config.model}" not found on the provided PrismaClient. ` +
        `Check the resource config for "${config.name}".`,
    );
  }

  // Wrap the raw prisma client in an adapter so hooks receive a `DataSourceAdapter`.
  const adapter: DataSourceAdapter = new PrismaDataSourceAdapter(prisma);

  const reader = new ReadRepository<T>(
    legacyModel,
    adapter,
    config,
    listSelect,
    oneSelect,
    configRegistry,
  );
  const writer = new WriteRepository<T>(legacyModel, adapter, config);

  // ── Resource-level decoration helpers ────────────────────────────────────
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
