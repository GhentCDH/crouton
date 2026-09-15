import { Body, Param, Patch, Req } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiResponse,
} from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import type { CrudRepository } from '../crud-repository.factory';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import { isOpEnabled, registerOperation, type OperationSpec } from './operation-registrar';

const describePatch = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): OperationSpec | null => {
  if (!isOpEnabled(ctx, 'patch', sub)) return null;

  const { cls, config, patchSchema, bodyDecorator } = ctx;
  const methodName = sub ? `patchChild_${sub.childRoute}` : 'patch';
  const route = sub ? `:id/${sub.childRoute}/:childId` : ':id';
  const name = sub ? sub.childRoute : config.name;

  const handler = sub
    ? async function (
        this: { repo: CrudRepository },
        _id: string,
        childId: string,
        body: any,
        req: any,
      ) {
        return this.repo.updateChild(sub, childId, body, req);
      }
    : function (
        this: { repo: CrudRepository },
        id: string,
        body: any,
        req: any,
      ) {
        return this.repo.patch(id, body, req);
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
        bodyDecorator(patchSchema)(cls.prototype, methodName, 1);
        Req()(cls.prototype, methodName, 2);
      };

  return {
    methodName,
    route,
    name,
    handler,
    paramDecorators,
    httpVerbDecorator: Patch,
    apiSummary: `Update a ${name}`,
    apiResponses: [
      (t, k, d) => ApiResponse({ status: 200, description: `${name} updated` })(t, k, d),
      (t, k, d) => ApiNotFoundResponse({ description: 'Not found' })(t, k, d),
    ],
    op: 'patch',
  };
};

/** Register `PATCH /:id`. No-ops when `patch` is disabled. */
export const registerPatch = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const spec = describePatch(ctx, sub);
  if (!spec) return;
  registerOperation(ctx, spec, sub);
};
