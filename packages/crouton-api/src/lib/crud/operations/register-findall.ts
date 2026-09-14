import { Get, Param, Query, Req } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import type { CrudRepository } from '../crud-repository.factory';
import { RequestDtoNoOffset } from '../request.dto';
import { type SubResourceConfig } from '../resource/SubResource.schema';
import { toJsonSchema } from '../schema.utils';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { isOpEnabled, registerOperation, type OperationSpec } from './operation-registrar';

const _findAll = async (
  repo: CrudRepository,
  params: any,
  q: string | undefined,
  lookupLabel: string | undefined,
  request?: any,
) => {
  const effectiveParams = { ...params };
  if (q && lookupLabel) {
    effectiveParams.filter = [...(params.filter ?? []), `${lookupLabel}:${q}`];
  }
  // Repositories that cannot count separately (custom repositories backed by a
  // remote API) implement `findAllWithCount` and return both in one round trip.
  const { data, count } = repo.findAllWithCount
    ? await repo.findAllWithCount(effectiveParams, request)
    : await Promise.all([
        repo.findAll(effectiveParams, request),
        repo.count(effectiveParams.filter),
      ]).then(([data, count]) => ({ data, count }));
  const totalPages = Math.max(1, Math.ceil(count / params.pageSize));
  return {
    data,
    request: {
      count,
      page: params.page,
      pageSize: params.pageSize,
      totalPages,
      sort: params.sort,
      sortDir: params.sortDir,
      filter: params.filter,
    },
  };
};

const findAllByParent = async (
  repo: CrudRepository,
  id: string,
  childRoute: string,
  params: any,
  request?: any,
) => {
  const { data, count } = await repo.findAllByParent(
    id,
    childRoute,
    params,
    request,
  );
  const totalPages = Math.max(1, Math.ceil(count / params.pageSize));
  return {
    data,
    request: {
      count,
      page: params.page,
      pageSize: params.pageSize,
      totalPages,
      sort: params.sort,
      sortDir: params.sortDir,
      filter: params.filter,
    },
  };
};

const describeFindAll = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): OperationSpec | null => {
  if (!isOpEnabled(ctx, 'findAll', sub)) return null;

  const { config, cls, listSchema } = ctx;
  const methodName = sub ? `findAllBy_${sub.childRoute}` : 'findAll';
  const route = sub ? `:id/${sub.childRoute}` : '';
  const name = sub ? sub.childRoute : config.name;
  const lookupLabel = sub ? undefined : config.lookup?.label;

  const handler = sub
    ? async function (
        this: { repo: CrudRepository },
        params: any,
        q: string | undefined,
        id: string,
        req: any,
      ) {
        return findAllByParent(this.repo, id, sub.childRoute, params, req);
      }
    : async function (
        this: { repo: CrudRepository },
        params: any,
        q: string | undefined,
        req: any,
      ) {
        return _findAll(this.repo, params, q, lookupLabel, req);
      };

  const paramDecorators = sub
    ? () => {
        Query(new ZodValidationPipe(RequestDtoNoOffset.schema as any))(cls.prototype, methodName, 0);
        Query('q')(cls.prototype, methodName, 1);
        Param('id')(cls.prototype, methodName, 2);
        Req()(cls.prototype, methodName, 3);
      }
    : () => {
        Query(new ZodValidationPipe(RequestDtoNoOffset.schema as any))(cls.prototype, methodName, 0);
        Query('q')(cls.prototype, methodName, 1);
        Req()(cls.prototype, methodName, 2);
      };

  return {
    methodName,
    route,
    name,
    handler,
    paramDecorators,
    httpVerbDecorator: Get,
    apiSummary: `List all ${name}s`,
    apiResponses: [
      (t, k, d) => ApiResponse({
        status: 200,
        description: `Array of ${name}`,
        ...(listSchema && {
          schema: { type: 'array', items: toJsonSchema(listSchema) },
        }),
      })(t, k, d),
    ],
    op: 'findAll',
  };
};

/**
 * Register `GET /` with pagination, sorting, filtering, and optional `?q=` lookup search.
 * No-ops when `findAll` is disabled in the resource config.
 */
export const registerFindAll = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const spec = describeFindAll(ctx, sub);
  if (!spec) return;
  registerOperation(ctx, spec, sub);
};
