import { Param, Put, Req } from '@nestjs/common';

import {
  isOperationEnabled,
  isOperationExternal,
} from '@ghentcdh/crouton-core';

import type { OperationContext } from './operation-context';
import {
  childWriteProperties,
  registerWriteOperation,
} from './register-write-operation';
import type { CrudRepository } from '../data-access/repository';
import type { SubResourceConfig } from '../resource/SubResource.schema';

const defaultUpdate = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'update')) return null;
  if (isOperationExternal(ctx.definition, 'update')) return null;
  const { cls, config, updateSchema, bodyDecorator } = ctx;
  const methodName = 'update';

  return {
    route: ':id',
    methodName,
    name: config.name,
    handler: function (
      this: { repo: CrudRepository },
      id: string,
      body: unknown,
      req: unknown,
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

/** Register `PUT /:id`. No-ops when `update` is disabled. */
export const registerUpdate = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const properties = sub
    ? childWriteProperties(ctx, sub, 'update')
    : defaultUpdate(ctx);
  if (!properties) return;

  registerWriteOperation(
    ctx,
    {
      verb: Put,
      operation: 'update',
      methodName: properties.methodName,
      route: properties.route,
      handler: properties.handler,
      decorators: properties.decorators,
      summary: `Replace a ${properties.name}`,
      description: `${properties.name} replaced`,
    },
    sub,
  );
};
