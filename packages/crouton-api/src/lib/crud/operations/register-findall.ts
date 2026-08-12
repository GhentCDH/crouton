import { Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import { isOperationEnabled } from '../crud.config';
import { def, desc } from './decorator.utils';
import type { CrudRepository } from '../crud-repository.factory';
import { RequestDtoNoOffset } from '../request.dto';
import { type SubResourceConfig } from '../resource/SubResource.schema';
import { toJsonSchema } from '../schema.utils';
import { ZodValidationPipe } from '../zod-validation.pipe';

const _findAll = async (
  repo: CrudRepository,
  params: any,
  q: string | undefined,
  lookupLabel: string | undefined,
) => {
  const effectiveParams = { ...params };
  if (q && lookupLabel) {
    effectiveParams.filter = [...(params.filter ?? []), `${lookupLabel}:${q}`];
  }
  const [data, count] = await Promise.all([
    repo.findAll(effectiveParams),
    repo.count(effectiveParams.filter),
  ]);
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
) => {
  const { data, count } = await repo.findAllByParent(id, childRoute, params);
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
    q?: string,
  ) {
    return _findAll(this.repo, params, q, lookupLabel);
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

export const childFindAll =
  (sub: SubResourceConfig) => (ctx: OperationContext) => {
    if (!isOperationEnabled(sub.operations, 'findAll')) return;

    const { cls } = ctx;
    const methodName = `findAllBy_${sub.childRoute}`;

    const findAll = async function (
      this: { repo: CrudRepository },
      params: any,
      q: string | undefined,
      id: string,
    ) {
      return findAllByParent(this.repo, id, sub.childRoute, params);
    };

    const decorators = () => {
      Param('id')(cls.prototype, methodName, 2);
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
  operationFn = defaultFindAll,
): void => {
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
  ApiOperation({ summary: `List all ${name}s` })(cls.prototype, methodName, d);
  ApiResponse({
    status: 200,
    description: `Array of ${name}`,
    ...(listSchema && {
      schema: { type: 'array', items: toJsonSchema(listSchema) },
    }),
  })(cls.prototype, methodName, d);

  properties.decorators();
};
