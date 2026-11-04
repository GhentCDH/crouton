import { Param, Patch, Req } from '@nestjs/common';

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

const defaultPatch = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'patch')) return null;
  if (isOperationExternal(ctx.definition, 'patch')) return null;
  const { cls, config, patchSchema, bodyDecorator } = ctx;
  const methodName = 'patch';

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
      return this.repo.patch(id, body, req);
    },
    decorators: () => {
      Param('id')(cls.prototype, methodName, 0);
      bodyDecorator(patchSchema)(cls.prototype, methodName, 1);
      Req()(cls.prototype, methodName, 2);
    },
  };
};

/** Register `PATCH /:id`. No-ops when `patch` is disabled. */
export const registerPatch = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const properties = sub
    ? childWriteProperties(ctx, sub, 'patch')
    : defaultPatch(ctx);
  if (!properties) return;

  registerWriteOperation(
    ctx,
    {
      verb: Patch,
      operation: 'patch',
      methodName: properties.methodName,
      route: properties.route,
      handler: properties.handler,
      decorators: properties.decorators,
      summary: `Update a ${properties.name}`,
      description: `${properties.name} updated`,
    },
    sub,
  );
};
