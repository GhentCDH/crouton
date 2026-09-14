import { Get, Param, Query, Req } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import type { CrudRepository, ChildScope } from '../crud-repository.factory';
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
  scope: ChildScope | undefined,
  request?: any,
) => {
  const effectiveParams = { ...params };
  if (q && lookupLabel) {
    effectiveParams.filter = [...(params.filter ?? []), `${lookupLabel}:${q}`];
  }
  const { data, count } = repo.findAllWithCount
    ? await repo.findAllWithCount(effectiveParams, scope, request)
    : scope
    ? await repo.findAllByParent!(scope.parentId, scope.sub.childRoute, effectiveParams, request)
    : await Promise.all([
        repo.findAll(effectiveParams, undefined, request),
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
        parentId: string,
        req: any,
      ) {
        return _findAll(this.repo, params, q, lookupLabel, { parentId, sub }, req);
      }
    : async function (
        this: { repo: CrudRepository },
        params: any,
        q: string | undefined,
        req: any,
      ) {
        return _findAll(this.repo, params, q, lookupLabel, undefined, req);
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
