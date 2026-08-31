import { Get, Param, Req } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import { isOperationEnabled } from '../crud.config';
import { def, desc } from './decorator.utils';
import type { CrudRepository } from '../crud-repository.factory';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import { toJsonSchema } from '../schema.utils';

const defaultFindOne = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'findOne')) return null;
  const { cls, config } = ctx;
  const methodName = 'findOne';

  return {
    route: ':id',
    methodName,
    name: config.name,
    findOneFn: function (this: { repo: CrudRepository }, id: string, req: any) {
      return this.repo.findOne(id, req);
    },
    decorators: () => {
      Param('id')(cls.prototype, methodName, 0);
      Req()(cls.prototype, methodName, 1);
    },
  };
};

const childFindOne = (sub: SubResourceConfig) => (ctx: OperationContext) => {
  if (!isOperationEnabled(sub.operations, 'findOne')) return null;
  const { cls } = ctx;
  const methodName = `findOneChild_${sub.childRoute}`;

  const findOneFn = async function (
    this: { repo: CrudRepository },
    parentId: string,
    childId: string,
    req: any,
  ) {
    return this.repo.findOneChild(sub, childId, parentId, req);
  };

  const decorators = () => {
    Param('id')(cls.prototype, methodName, 0);
    Param('childId')(cls.prototype, methodName, 1);
    Req()(cls.prototype, methodName, 2);
  };

  return {
    route: `:id/${sub.childRoute}/:childId`,
    methodName,
    name: sub.childRoute,
    findOneFn,
    decorators,
  };
};

/** Register `GET /:id`. No-ops when `findOne` is disabled. */
export const registerFindOne = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const operationFn = sub ? childFindOne(sub) : defaultFindOne;
  const properties = operationFn(ctx);
  if (!properties) return;

  const { methodName, route, name } = properties;
  const { cls } = ctx;

  def(cls, methodName, properties.findOneFn);
  const d = desc(cls, methodName);
  Get(route)(cls.prototype, methodName, d);
  ApiOperation({ summary: `Get one ${name} by id` })(
    cls.prototype,
    methodName,
    d,
  );
  ApiParam(ctx.idParamMeta)(cls.prototype, methodName, d);
  ApiResponse({
    status: 200,
    description: `The ${name}`,
    ...(ctx.oneSchema && { schema: toJsonSchema(ctx.oneSchema) }),
  })(cls.prototype, methodName, d);
  ApiNotFoundResponse({ description: 'Not found' })(
    cls.prototype,
    methodName,
    d,
  );

  properties.decorators();
  ctx.secure(methodName, 'findOne', sub);
};
