import {
  BadRequestException,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';

import { type ListRequest, offsetOf } from '@ghentcdh/crouton-core';

import {
  type CustomListResult,
  type CustomOp,
  type CustomRepository,
  type CustomRepositoryContext,
  PARENT_METHOD,
} from './custom-repository.types';
import { DEFAULT_ID_FIELD, DEFAULT_ID_TYPE } from '../constants';
import type { CrudRepository } from '../crud-repository.factory';
import { PrismaDataSourceAdapter } from '../data-source/prisma.adapter';
import { decorateRow, decorateRows, postWrite, prepareWrite } from '../hooks';
import { type Resource } from '../resource/ResourceConfig.schema';
import type { ResourceConfigRegistry } from '../resource-config.registry';
import { resolveValueLabelColumns } from '../translation';

/** Minimal view of `DataSourceRegistry`, kept structural to avoid a cycle. */
export type DataSourceResolver = {
  resolve(name?: string): any;
  entries(): { name: string; client: unknown }[];
};

const unsupported = (config: Resource, op: CustomOp): never => {
  const method = config.parent ? PARENT_METHOD[op] : op;
  throw new NotImplementedException(
    `Resource "${config.name}" enables "${op}" but its repository.ts does not implement "${method}".`,
  );
};

/**
 * Adapt a user-supplied `CustomRepository` to the full `CrudRepository`
 * interface the controllers depend on.
 *
 * Responsibilities that stay with the framework rather than the user:
 * - id coercion per `idType`, so a numeric key arrives as a number;
 * - lifecycle hooks and the `{value,label}` envelope, via the shared helpers —
 *   so `hooks.ts` behaves the same on a custom resource;
 * - 404 on a missing row, so the user returns `null` instead of throwing;
 * - `patch` falling back to `update`, matching the Prisma repository.
 *
 * Sub-resource operations are not part of the contract yet: nested child routes
 * are derived from Prisma relations. They throw rather than silently returning
 * nothing.
 */
export const createCustomRepository = <T = any>(
  prisma: any,
  config: Resource,
  dataSources: DataSourceResolver,
  repository: CustomRepository<T> | undefined,
  configRegistry?: ResourceConfigRegistry,
): CrudRepository<T> => {
  // Wrap the raw prisma client in an adapter so hook contexts receive `dataSource`.
  const adapter = new PrismaDataSourceAdapter(prisma);

  const repo = repository ?? {};
  const idField = config.idField ?? DEFAULT_ID_FIELD;

  const toId = (id: string | number): string | number =>
    (config.idType ?? DEFAULT_ID_TYPE) === 'number' ? +id : String(id);

  const parentRef = config.parent;

  /**
   * Parent id for a nested resource, read from the request path.
   *
   * A nested resource registers no unnested route, so the param is always
   * present in practice. Missing means the repository was called outside the
   * controller — fail loudly rather than silently querying across all parents.
   */
  const parentIdFrom = (request: any): string | number => {
    const raw = request?.params?.[parentRef!.param];
    if (raw === undefined || raw === null || raw === '') {
      throw new BadRequestException(
        `Resource "${config.name}" is nested under "${parentRef!.route}" but no "${parentRef!.param}" was supplied.`,
      );
    }
    return (parentRef!.idType ?? 'string') === 'number' ? +raw : String(raw);
  };

  const parentCtx = (
    request: any,
    parentId: string | number,
  ): { parent: NonNullable<CustomRepositoryContext['parent']> } => ({
    parent: { route: parentRef!.route, param: parentRef!.param, id: parentId },
  });

  /**
   * The parent for a hook context — same shape hooks get on a sub-resource, so a
   * `hooks.ts` reads `ctx.parent.id` regardless of which way the resource nests.
   * `undefined` when the resource is not nested, or when the request carries no
   * parent id to read (a hook must not be handed a fabricated one).
   */
  const parentHookCtx = (request: any) => {
    if (!parentRef) return undefined;
    const raw = request?.params?.[parentRef.param];
    if (raw === undefined || raw === null || raw === '') return undefined;
    return {
      route: parentRef.route,
      param: parentRef.param,
      id: (parentRef.idType ?? 'string') === 'number' ? +raw : String(raw),
    };
  };

  const ctx = (
    op: CustomOp,
    params?: ListRequest,
    id?: string | number,
    request?: any,
  ): CustomRepositoryContext => ({
    prisma,
    dataSources,
    config,
    op,
    offset: params ? offsetOf(params) : 0,
    ...(id !== undefined && { id }),
    ...(request !== undefined && { request }),
  });

  const findAllWithCount = async (
    params: ListRequest,
    request?: any,
  ): Promise<CustomListResult<T>> => {
    let result: CustomListResult<T> | undefined;

    if (parentRef) {
      if (!repo.findAllByParent) unsupported(config, 'findAll');
      const parentId = parentIdFrom(request);
      result = await repo.findAllByParent!(parentId, params, {
        ...ctx('findAll', params, undefined, request),
        ...parentCtx(request, parentId),
      });
    } else {
      if (!repo.findAll) unsupported(config, 'findAll');
      result = await repo.findAll!(
        params,
        ctx('findAll', params, undefined, request),
      );
    }

    const vlCols = await resolveValueLabelColumns(
      config.route,
      config.valueLabelColumns,
      configRegistry,
    );
    const target =
      vlCols === config.valueLabelColumns
        ? config
        : { hooks: config.hooks, valueLabelColumns: vlCols };
    const data = await decorateRows(
      result?.data ?? [],
      'findAll',
      target,
      adapter,
      request,
      parentHookCtx(request),
    );
    return { data, count: result?.count ?? data.length };
  };

  const findOne = async (id: string | number, request?: any): Promise<T> => {
    let row: T | null | undefined;

    if (parentRef) {
      if (!repo.findOneByParent) unsupported(config, 'findOne');
      const parentId = parentIdFrom(request);
      row = await repo.findOneByParent!(parentId, toId(id), {
        ...ctx('findOne', undefined, id, request),
        ...parentCtx(request, parentId),
      });
    } else {
      if (!repo.findOne) unsupported(config, 'findOne');
      row = await repo.findOne!(
        toId(id),
        ctx('findOne', undefined, id, request),
      );
    }

    if (row === null || row === undefined) {
      throw new NotFoundException(`${config.name} with id ${id} not found`);
    }
    return decorateRow(
      row,
      'findOne',
      config,
      adapter,
      request,
      parentHookCtx(request),
    );
  };

  const write = async (
    op: 'create' | 'update' | 'patch',
    data: unknown,
    id?: string | number,
    request?: any,
  ): Promise<T> => {
    const coercedId = id !== undefined ? toId(id) : undefined;

    // `patch` falls back to `update` in both flavours: the Prisma repository
    // treats patch as an update with a partial schema, so a repository that
    // only implements the update variant behaves consistently.
    const prepared = () =>
      prepareWrite(
        data,
        op,
        config,
        adapter,
        coercedId,
        request,
        parentHookCtx(request),
      );

    let result: T;

    if (parentRef) {
      const fn =
        op === 'create'
          ? repo.createByParent
          : op === 'update'
            ? repo.updateByParent
            : (repo.patchByParent ?? repo.updateByParent);
      if (!fn) unsupported(config, op);

      const parentId = parentIdFrom(request);
      const nestedCtx = {
        ...ctx(op, undefined, coercedId, request),
        ...parentCtx(request, parentId),
      };
      const body = await prepared();

      result =
        op === 'create'
          ? await (fn as NonNullable<CustomRepository<T>['createByParent']>)(
              parentId,
              body,
              nestedCtx,
            )
          : await (fn as NonNullable<CustomRepository<T>['updateByParent']>)(
              parentId,
              coercedId!,
              body,
              nestedCtx,
            );
    } else {
      const fn =
        op === 'create'
          ? repo.create
          : op === 'update'
            ? repo.update
            : (repo.patch ?? repo.update);
      if (!fn) unsupported(config, op);

      const body = await prepared();

      result =
        op === 'create'
          ? await (fn as NonNullable<CustomRepository<T>['create']>)(
              body,
              ctx('create', undefined, undefined, request),
            )
          : await (fn as NonNullable<CustomRepository<T>['update']>)(
              coercedId!,
              body,
              ctx(op, undefined, coercedId, request),
            );
    }

    return postWrite(
      result,
      op,
      config,
      adapter,
      coercedId,
      request,
      parentHookCtx(request),
    );
  };

  // Async so callers get a rejected promise rather than a synchronous throw,
  // matching every other method's `Promise<T>` signature.
  const notAChildRepository = async (): Promise<never> => {
    throw new NotImplementedException(
      `Resource "${config.name}" is a custom resource; nested sub-resource routes are not supported. ` +
        'Expose the child collection as its own resource instead.',
    );
  };

  return {
    prisma,
    // Preferred by register-findall: one round trip returns rows and count.
    findAllWithCount,
    findAll: async (params, request) =>
      (await findAllWithCount(params, request)).data,
    count: async (filter) =>
      (
        await findAllWithCount({
          page: 1,
          pageSize: 1,
          sort: idField,
          sortDir: 'asc',
          filter: filter ?? [],
        })
      ).count,
    findOne,
    create: (data, request) => write('create', data, undefined, request),
    update: (id, data, request) => write('update', data, id, request),
    patch: (id, data, request) => write('patch', data, id, request),
    delete: async (id, request) => {
      const coercedId = toId(id);
      let result: T;

      if (parentRef) {
        if (!repo.deleteByParent) unsupported(config, 'delete');
        const parentId = parentIdFrom(request);
        result = await repo.deleteByParent!(parentId, coercedId, {
          ...ctx('delete', undefined, coercedId, request),
          ...parentCtx(request, parentId),
        });
      } else {
        if (!repo.delete) unsupported(config, 'delete');
        result = await repo.delete!(
          coercedId,
          ctx('delete', undefined, coercedId, request),
        );
      }
      return postWrite(
        result,
        'delete',
        config,
        adapter,
        coercedId,
        request,
        parentHookCtx(request),
      );
    },
    upsert: async () => {
      throw new NotImplementedException(
        `Resource "${config.name}" is a custom resource; upsert is not part of the repository contract.`,
      );
    },
    upsertMany: async () => {
      throw new NotImplementedException(
        `Resource "${config.name}" is a custom resource; upsert is not part of the repository contract.`,
      );
    },
    findAllByParent: notAChildRepository,
    findOneChild: notAChildRepository,
    createChild: notAChildRepository,
    updateChild: notAChildRepository,
    deleteChild: notAChildRepository,
  };
};
