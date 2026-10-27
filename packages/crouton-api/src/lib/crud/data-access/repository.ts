import { NotFoundException } from '@nestjs/common';

import {
  type ListRequest,
  type Row,
  offsetOf,
  resolveDefinition,
  schemaFor,
} from '@ghentcdh/crouton-core';

import {
  type DataSourceResolver,
  createCustomRepository,
} from '../custom-repository';
import type { DataSourceAdapter } from './adapter';
import { PrismaDataSourceAdapter } from './adapter';
import { getDelegate, type PrismaClientLike } from '../types/prisma.types';
import {
  applyAfterFindAll,
  applyBeforeFindAll,
  decorateRow,
  decorateRows,
  postWrite,
  prepareWrite,
} from './middleware/hooks';
import { ReadRepository } from './read.repository';
import { WriteRepository, stripSubResourceKeys } from './write.repository';
import { type Resource } from '../resource/ResourceConfig.schema';
import { type SubResourceConfig } from '../resource/SubResource.schema';
import type { ResourceConfigRegistry } from '../resource-config.registry';
import { toSelectFields } from './query/select';

/** Unified read/write interface for a CRUD resource, combining `ReadRepository` and `WriteRepository`. */
export interface CrudRepository<T = Row> {
  /** Raw backend client — used by action procedures. */
  readonly prisma: unknown;
  findAll(params: ListRequest, request?: unknown): Promise<T[]>;
  count(filter: string[], q?: string): Promise<number>;
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
    request?: unknown,
  ): Promise<{ data: T[]; count: number }>;
  findOne(id: number | string, request?: unknown): Promise<T>;
  findAllByParent(
    parentId: string | number,
    childRoute: string,
    params: ListRequest,
    request?: unknown,
  ): Promise<{ data: T[]; count: number }>;
  findOneChild(
    sub: SubResourceConfig,
    childId: string | number,
    parentId?: string | number,
    request?: unknown,
  ): Promise<T>;
  createChild(
    parentId: string | number,
    sub: SubResourceConfig,
    data: unknown,
    request?: unknown,
  ): Promise<T>;
  updateChild(
    sub: SubResourceConfig,
    childId: string | number,
    data: unknown,
    request?: unknown,
  ): Promise<T>;
  deleteChild(
    sub: SubResourceConfig,
    childId: string | number,
    parentId?: string | number,
    request?: unknown,
  ): Promise<T>;
  create(data: unknown, request?: unknown): Promise<T>;
  update(id: number | string, data: unknown, request?: unknown): Promise<T>;
  patch(id: number | string, data: unknown, request?: unknown): Promise<T>;
  delete(id: number | string, request?: unknown): Promise<T>;
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
 * @param dataSources
 * @param configRegistry
 * @param dataSources
 * @param configRegistry
 * @throws {Error} When `config.model` is not found on the provided PrismaClient.
 */
export function createCrudRepository<T = Row>(
  prisma: unknown,
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
    const baseCtx = {
      config,
      op: 'n/a',
      offset: 0,
      listSelect,
      oneSelect,
      configRegistry,
    };
    const ctx = (request?: unknown, op = 'findAll', id?: string | number) => ({
      ...baseCtx,
      op,
      request,
      ...(id !== undefined && { id }),
    });

    const mkDecorateFindAll =
      (adapter: DataSourceAdapter) =>
      async (rows: unknown[], request?: unknown): Promise<unknown[]> => {
        const decorated = await decorateRows(
          rows,
          'findAll',
          config,
          adapter,
          request,
        );
        return applyAfterFindAll(decorated, config, adapter, request);
      };
    const decorateFindAll = mkDecorateFindAll(resolvedAdapter);
    const applyBefore = (params: ListRequest, request?: unknown) =>
      applyBeforeFindAll(params, config, resolvedAdapter, request);
    const decorateFindOne = (row: unknown, request?: unknown) =>
      decorateRow(row, 'findOne', config, resolvedAdapter, request);
    const prepareData = (
      data: unknown,
      op: 'create' | 'update' | 'patch',
      id?: string | number,
      request?: unknown,
    ) => prepareWrite(data, op, config, resolvedAdapter, id, request);
    const postData = (
      result: unknown,
      op: 'create' | 'update' | 'patch' | 'delete',
      id?: string | number,
      request?: unknown,
    ) => postWrite(result, op, config, resolvedAdapter, id, request);
    const toId = (id: string | number): string | number =>
      (config.idType ?? 'string') === 'number' ? +id : String(id);

    const adapterFindAllByParent = async (
      parentId: string | number,
      childRoute: string,
      params: ListRequest,
      request?: unknown,
    ): Promise<{ data: T[]; count: number }> => {
      if (resolvedAdapter.findAllByParent) {
        const sub = config.subResources?.find(
          (s) => s.childRoute === childRoute,
        );
        if (!sub)
          throw new Error(
            `No sub-resource "${childRoute}" on "${config.name}"`,
          );
        return resolvedAdapter.findAllByParent(
          adapterModelKey,
          parentId,
          sub,
          params,
          ctx(request, 'findAll'),
        ) as Promise<{ data: T[]; count: number }>;
      }
      // Fallback: only available when prisma model exists (Prisma adapter).
      if (!config.model)
        throw new Error(
          `Adapter for "${config.name}" does not implement findAllByParent`,
        );
      const prismaModel = getDelegate(prisma as PrismaClientLike, config.model);
      const reader = new ReadRepository<T>(
        prismaModel!,
        resolvedAdapter,
        config,
        listSelect,
        oneSelect,
        configRegistry,
      );
      return reader.findAllByParent(parentId, childRoute, params, request);
    };

    const adapterFindOneChild = async (
      sub: SubResourceConfig,
      childId: string | number,
      parentId?: string | number,
      request?: unknown,
    ): Promise<T> => {
      if (resolvedAdapter.findOneChild) {
        const row = await resolvedAdapter.findOneChild(
          adapterModelKey,
          sub,
          childId,
          parentId,
          ctx(request, 'findOne', childId),
        );
        if (row === null || row === undefined)
          throw new NotFoundException(
            `${sub.childRoute} with id ${childId} not found`,
          );
        return row as T;
      }
      if (!config.model)
        throw new Error(
          `Adapter for "${config.name}" does not implement findOneChild`,
        );
      const prismaModel = getDelegate(prisma as PrismaClientLike, config.model);
      const reader = new ReadRepository<T>(
        prismaModel!,
        resolvedAdapter,
        config,
        listSelect,
        oneSelect,
        configRegistry,
      );
      return reader.findOneChild(sub, childId, parentId, request) as Promise<T>;
    };

    const prismaModel = config.model ? getDelegate(prisma as PrismaClientLike, config.model) : undefined;
    const writer = prismaModel
      ? new WriteRepository<T>(prismaModel, resolvedAdapter, config)
      : undefined;

    return {
      prisma,
      findAllWithCount: async (params, request) => {
        const effectiveParams = await applyBefore(params, request);
        const { data, count } = await resolvedAdapter.findAll!(
          adapterModelKey,
          effectiveParams,
          { ...ctx(request, 'findAll'), offset: offsetOf(effectiveParams) },
        );
        return { data: await decorateFindAll(data, request), count };
      },
      findAll: async (params, request) => {
        const effectiveParams = await applyBefore(params, request);
        const { data } = await resolvedAdapter.findAll!(
          adapterModelKey,
          effectiveParams,
          { ...ctx(request, 'findAll'), offset: offsetOf(effectiveParams) },
        );
        return decorateFindAll(data, request);
      },
      count: (filter, q) =>
        resolvedAdapter.count!(adapterModelKey, filter, { ...baseCtx, q }),
      findOne: async (id, request) => {
        const row = await resolvedAdapter.findOne!(
          adapterModelKey,
          id,
          ctx(request, 'findOne', id),
        );
        if (row === null || row === undefined)
          throw new NotFoundException(`${config.name} with id ${id} not found`);
        return decorateFindOne(row, request);
      },
      findAllByParent: adapterFindAllByParent,
      findOneChild: adapterFindOneChild,
      create: async (data, request) => {
        const stripped = stripSubResourceKeys(config, data);
        const prepared = await prepareData(
          stripped,
          'create',
          undefined,
          request,
        );
        const result = await resolvedAdapter.create!(
          adapterModelKey,
          prepared,
          ctx(request, 'create'),
        );
        return postData(result, 'create', undefined, request);
      },
      update: async (id, data, request) => {
        const coercedId = toId(id);
        const stripped = stripSubResourceKeys(config, data);
        const prepared = await prepareData(
          stripped,
          'update',
          coercedId,
          request,
        );
        const result = await resolvedAdapter.update!(
          adapterModelKey,
          id,
          prepared,
          ctx(request, 'update', coercedId),
        );
        return postData(result, 'update', coercedId, request);
      },
      patch: async (id, data, request) => {
        const coercedId = toId(id);
        const stripped = stripSubResourceKeys(config, data);
        const prepared = await prepareData(
          stripped,
          'patch',
          coercedId,
          request,
        );
        const patchOrUpdate = (resolvedAdapter.patch ??
          resolvedAdapter.update)!.bind(resolvedAdapter);
        const result = await patchOrUpdate(
          adapterModelKey,
          id,
          prepared,
          ctx(request, 'patch', coercedId),
        );
        return postData(result, 'patch', coercedId, request);
      },
      delete: async (id, request) => {
        const coercedId = toId(id);
        const result = await resolvedAdapter.delete!(
          adapterModelKey,
          id,
          ctx(request, 'delete', coercedId),
        );
        return postData(result, 'delete', coercedId, request);
      },
      createChild: writer
        ? writer.createChild.bind(writer)
        : () =>
            Promise.reject(
              new Error(
                `createChild not supported for "${config.name}" (no Prisma model)`,
              ),
            ),
      updateChild: writer
        ? writer.updateChild.bind(writer)
        : () =>
            Promise.reject(
              new Error(
                `updateChild not supported for "${config.name}" (no Prisma model)`,
              ),
            ),
      deleteChild: writer
        ? writer.deleteChild.bind(writer)
        : () =>
            Promise.reject(
              new Error(
                `deleteChild not supported for "${config.name}" (no Prisma model)`,
              ),
            ),
    } as CrudRepository<T>;
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
  const decorateFindAll = async (
    rows: unknown[],
    request?: unknown,
  ): Promise<unknown[]> => {
    const decorated = await decorateRows(
      rows,
      'findAll',
      config,
      adapter,
      request,
    );
    return applyAfterFindAll(decorated, config, adapter, request);
  };

  const decorateFindOne = (row: unknown, request?: unknown): Promise<unknown> =>
    decorateRow(row, 'findOne', config, adapter, request);

  const prepareData = (
    data: unknown,
    op: 'create' | 'update' | 'patch',
    id?: string | number,
    request?: unknown,
  ) => prepareWrite(data, op, config, adapter, id, request);

  const postData = (
    result: unknown,
    op: 'create' | 'update' | 'patch' | 'delete',
    id?: string | number,
    request?: unknown,
  ) => postWrite(result, op, config, adapter, id, request);

  const toId = (id: string | number): string | number =>
    (config.idType ?? 'string') === 'number' ? +id : String(id);

  return {
    prisma,
    findAll: async (params, request) => {
      const effectiveParams = await applyBeforeFindAll(
        params,
        config,
        adapter,
        request,
      );
      return decorateFindAll(
        await reader.findAll(effectiveParams, request),
        request,
      );
    },
    count: reader.count.bind(reader),
    findOne: async (id, request) =>
      decorateFindOne(await reader.findOne(id, request), request),
    findAllByParent: reader.findAllByParent.bind(reader),
    findOneChild: reader.findOneChild.bind(reader),
    create: async (data, request) => {
      const stripped = stripSubResourceKeys(config, data);
      const prepared = await prepareData(
        stripped,
        'create',
        undefined,
        request,
      );
      const result = await writer.create(prepared, request);
      return postData(result, 'create', undefined, request);
    },
    update: async (id, data, request) => {
      const coercedId = toId(id);
      const stripped = stripSubResourceKeys(config, data);
      const prepared = await prepareData(
        stripped,
        'update',
        coercedId,
        request,
      );
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
    delete: async (id, request) => {
      const coercedId = toId(id);
      const result = await writer.delete(id, request);
      return postData(result, 'delete', coercedId, request);
    },
    createChild: writer.createChild.bind(writer),
    updateChild: writer.updateChild.bind(writer),
    deleteChild: writer.deleteChild.bind(writer),
  } as CrudRepository<T>;
}
