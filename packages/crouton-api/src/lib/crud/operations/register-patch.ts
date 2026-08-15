import { Body, Param, Patch, Req } from '@nestjs/common';
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

const defaultPatch = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'patch')) return null;
  const { cls, config, patchSchema, bodyDecorator } = ctx;
  const methodName = 'patch';

  return {
    route: ':id',
    methodName,
    name: config.name,
    patchFn: function (
      this: { repo: CrudRepository },
      id: string,
      body: any,
      req: any,
    ) {
      return this.repo.patch(id, body, req);
    },
    decorators: () => {
      Param('id')(cls.prototype, methodName, 0);
      bodyDecorator(patchSchema)(cls.prototype, methodName, 1);
      Req()(cls.prototype, methodName, 2);
    },
  };
};

const childPatch = (sub: SubResourceConfig) => (ctx: OperationContext) => {
  if (!isOperationEnabled(sub.operations, 'patch')) return null;
  const { cls } = ctx;
  const methodName = `patchChild_${sub.childRoute}`;

  const patchFn = async function (
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
    patchFn,
    decorators,
  };
};

/** Register `PATCH /:id`. No-ops when `patch` is disabled. */
export const registerPatch = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const operationFn = sub ? childPatch(sub) : defaultPatch;
  const properties = operationFn(ctx);
  if (!properties) return;

  const { methodName, route, name } = properties;
  const { cls } = ctx;

  def(cls, methodName, properties.patchFn);
  const d = desc(cls, methodName);
  Patch(route)(cls.prototype, methodName, d);
  ApiOperation({ summary: `Update a ${name}` })(cls.prototype, methodName, d);
  ApiResponse({ status: 200, description: `${name} updated` })(
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
