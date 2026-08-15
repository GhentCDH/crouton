import { Body, Param, Put, Req } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';
import type { CrudRepository } from '../crud-repository.factory';
import { isOperationEnabled } from '../crud.config';
import type { SubResourceConfig } from '../resource/SubResource.schema';

const defaultUpdate = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'update')) return null;
  const { cls, config, updateSchema, bodyDecorator } = ctx;
  const methodName = 'update';

  return {
    route: ':id',
    methodName,
    name: config.name,
    updateFn: function (
      this: { repo: CrudRepository },
      id: string,
      body: any,
      req: any,
    ) {
      return this.repo.update(id, body, req);
    },
    decorators: () => {
      Param('id')(cls.prototype, methodName, 0);
      bodyDecorator(updateSchema)(cls.prototype, methodName, 1);
      Req()(cls.prototype, methodName, 2);
    },
  };
};

const childUpdate = (sub: SubResourceConfig) => (ctx: OperationContext) => {
  if (!isOperationEnabled(sub.operations, 'update')) return null;
  const { cls } = ctx;
  const methodName = `updateChild_${sub.childRoute}`;

  const updateFn = async function (
    this: { repo: CrudRepository },
    _id: string,
    childId: string,
    body: any,
    req: any,
  ) {
    return this.repo.updateChild(sub, childId, body, req);
  };

  const decorators = () => {
    Param('id')(cls.prototype, methodName, 0);
    Param('childId')(cls.prototype, methodName, 1);
    Body()(cls.prototype, methodName, 2);
    Req()(cls.prototype, methodName, 3);
  };

  return {
    route: `:id/${sub.childRoute}/:childId`,
    methodName,
    name: sub.childRoute,
    updateFn,
    decorators,
  };
};

/** Register `PUT /:id`. No-ops when `update` is disabled. */
export const registerUpdate = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const operationFn = sub ? childUpdate(sub) : defaultUpdate;
  const properties = operationFn(ctx);
  if (!properties) return;

  const { methodName, route, name } = properties;
  const { cls } = ctx;

  def(cls, methodName, properties.updateFn);
  const d = desc(cls, methodName);
  Put(route)(cls.prototype, methodName, d);
  ApiOperation({ summary: `Replace a ${name}` })(cls.prototype, methodName, d);
  ApiResponse({ status: 200, description: `${name} replaced` })(
    cls.prototype,
    methodName,
    d,
  );
  ApiNotFoundResponse({ description: 'Not found' })(
    cls.prototype,
    methodName,
    d,
  );

  properties.decorators();
};
