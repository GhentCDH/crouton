import { Body, Param, Put, Req } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiResponse,
} from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import type { CrudRepository } from '../crud-repository.factory';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import { isOpEnabled, registerOperation, type OperationSpec } from './operation-registrar';

const describeUpdate = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): OperationSpec | null => {
  if (!isOpEnabled(ctx, 'update', sub)) return null;

  const { cls, config, updateSchema, bodyDecorator } = ctx;
  const methodName = sub ? `updateChild_${sub.childRoute}` : 'update';
  const route = sub ? `:id/${sub.childRoute}/:childId` : ':id';
  const name = sub ? sub.childRoute : config.name;

  const handler = sub
    ? async function (
        this: { repo: CrudRepository },
        parentId: string,
        childId: string,
        body: any,
        req: any,
      ) {
        return this.repo.update(childId, body, { parentId, sub }, req);
      }
    : function (
        this: { repo: CrudRepository },
        id: string,
        body: any,
        req: any,
      ) {
        return this.repo.update(id, body, undefined, req);
      };

  const paramDecorators = sub
    ? () => {
        Param('id')(cls.prototype, methodName, 0);
        Param('childId')(cls.prototype, methodName, 1);
        Body()(cls.prototype, methodName, 2);
        Req()(cls.prototype, methodName, 3);
      }
    : () => {
        Param('id')(cls.prototype, methodName, 0);
        bodyDecorator(updateSchema)(cls.prototype, methodName, 1);
        Req()(cls.prototype, methodName, 2);
      };

  return {
    methodName,
    route,
    name,
    handler,
    paramDecorators,
    httpVerbDecorator: Put,
    apiSummary: `Replace a ${name}`,
    apiResponses: [
      (t, k, d) => ApiResponse({ status: 200, description: `${name} replaced` })(t, k, d),
      (t, k, d) => ApiNotFoundResponse({ description: 'Not found' })(t, k, d),
    ],
    op: 'update',
  };
};

/** Register `PUT /:id`. No-ops when `update` is disabled. */
export const registerUpdate = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const spec = describeUpdate(ctx, sub);
  if (!spec) return;
  registerOperation(ctx, spec, sub);
};
