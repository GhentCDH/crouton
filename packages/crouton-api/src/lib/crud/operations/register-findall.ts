import { Get, Param, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import { isOperationEnabled } from '../crud.config';
import { def, desc } from './decorator.utils';
import type { CrudRepository } from '../crud-repository.factory';
import { RequestDtoNoOffset } from '../request.dto';
import { type SubResourceConfig } from '../resource/SubResource.schema';
import { toJsonSchema } from '../schema.utils';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { childSchemas } from './register-schemas';

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

const defaultFindAll = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'findAll')) return;

  const { config } = ctx;
  const lookupLabel = config.lookup?.label;
  const findAll = async function (
    this: { repo: CrudRepository },
    params: any,
    q: string | undefined,
    req: any,
  ) {
    return _findAll(this.repo, params, q, lookupLabel, req);
  };

  return {
    route: '',
    name: config.name,
    methodName: 'findAll',
    findAll,
    listSchema: ctx.listSchema,
    decorators: () => {
      //
    },
  };
};

const childFindAll = (sub: SubResourceConfig) => (ctx: OperationContext) => {
  if (!isOperationEnabled(sub.operations, 'findAll')) return;

  const { cls } = ctx;
  const methodName = `findAllBy_${sub.childRoute}`;

  const findAll = async function (
    this: { repo: CrudRepository },
    params: any,
    q: string | undefined,
    id: string,
    req: any,
  ) {
    return findAllByParent(this.repo, id, sub.childRoute, params, req);
  };

  const decorators = () => {
    Param('id')(cls.prototype, methodName, 2);
    Req()(cls.prototype, methodName, 3);
  };

  return {
    name: sub.childRoute,
    methodName,
    findAll,
    route: `:id/${sub.childRoute}`,
    decorators,
    listSchema: ctx.listSchema,
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
  const operationFn = sub ? childFindAll(sub) : defaultFindAll;
  const properties = operationFn(ctx);
  if (!properties) return;

  const { methodName, route, name, listSchema } = properties;
  const { cls } = ctx;

  def(cls, methodName, properties.findAll);
  const d = desc(cls, methodName);
  Get(route)(cls.prototype, methodName, d);
  Query(new ZodValidationPipe(RequestDtoNoOffset.zodSchema as any))(
    cls.prototype,
    methodName,
    0,
  );
  Query('q')(cls.prototype, methodName, 1);
  if (!sub) Req()(cls.prototype, methodName, 2);
  ApiOperation({ summary: `List all ${name}s` })(cls.prototype, methodName, d);
  ApiResponse({
    status: 200,
    description: `Array of ${name}`,
    ...(listSchema && {
      schema: { type: 'array', items: toJsonSchema(listSchema) },
    }),
  })(cls.prototype, methodName, d);

  properties.decorators();
  ctx.secure(methodName, 'findAll', sub);
};
