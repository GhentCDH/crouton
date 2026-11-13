import { Param, Patch, Put, Req } from '@nestjs/common';

import {
  isOperationEnabled,
  isOperationExternal,
} from '@ghentcdh/crouton-core';

import type { CrudRepository } from '../data-access/repository';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import type { OperationContext } from './operation-context';
import {
  childWriteProperties,
  registerWriteOperation,
} from './register-write-operation';

/** `PUT /:id` (update = full replace) and `PATCH /:id` differ only in these. */
const ID_WRITES = {
  update: { verb: Put, schema: 'updateSchema', summary: 'Replace', past: 'replaced' },
  patch: { verb: Patch, schema: 'patchSchema', summary: 'Update', past: 'updated' },
} as const;

type IdWrite = keyof typeof ID_WRITES;

const defaultIdWrite = (ctx: OperationContext, operation: IdWrite) => {
  if (!isOperationEnabled(ctx.definition, operation)) return null;
  if (isOperationExternal(ctx.definition, operation)) return null;
  const { cls, config, bodyDecorator } = ctx;
  const schema = ctx[ID_WRITES[operation].schema];
  const methodName = operation;

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
      return this.repo[operation](id, body, req);
    },
    decorators: () => {
      Param('id')(cls.prototype, methodName, 0);
      bodyDecorator(schema)(cls.prototype, methodName, 1);
      Req()(cls.prototype, methodName, 2);
    },
  };
};

const registerIdWrite = (
  operation: IdWrite,
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const properties = sub
    ? childWriteProperties(ctx, sub, operation)
    : defaultIdWrite(ctx, operation);
  if (!properties) return;

  const { verb, summary, past } = ID_WRITES[operation];
  registerWriteOperation(
    ctx,
    {
      verb,
      operation,
      methodName: properties.methodName,
      route: properties.route,
      handler: properties.handler,
      decorators: properties.decorators,
      summary: `${summary} a ${properties.name}`,
      description: `${properties.name} ${past}`,
    },
    sub,
  );
};

/** Register `PUT /:id`. No-ops when `update` is disabled. */
export const registerUpdate = (ctx: OperationContext, sub?: SubResourceConfig): void =>
  registerIdWrite('update', ctx, sub);

/** Register `PATCH /:id`. No-ops when `patch` is disabled. */
export const registerPatch = (ctx: OperationContext, sub?: SubResourceConfig): void =>
  registerIdWrite('patch', ctx, sub);
