import { Get, Param, Req } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import type { CrudRepository } from '../crud-repository.factory';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import { toJsonSchema } from '../schema.utils';
import { isOpEnabled, registerOperation, type OperationSpec } from './operation-registrar';

const describeFindOne = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): OperationSpec | null => {
  if (!isOpEnabled(ctx, 'findOne', sub)) return null;

  const { cls, config } = ctx;
  const methodName = sub ? `findOneChild_${sub.childRoute}` : 'findOne';
  const route = sub ? `:id/${sub.childRoute}/:childId` : ':id';
  const name = sub ? sub.childRoute : config.name;

  const handler = sub
    ? async function (
        this: { repo: CrudRepository },
        parentId: string,
        childId: string,
        req: any,
      ) {
        return this.repo.findOneChild(sub, childId, parentId, req);
      }
    : function (this: { repo: CrudRepository }, id: string, req: any) {
        return this.repo.findOne(id, req);
      };

  const paramDecorators = sub
    ? () => {
        Param('id')(cls.prototype, methodName, 0);
        Param('childId')(cls.prototype, methodName, 1);
        Req()(cls.prototype, methodName, 2);
      }
    : () => {
        Param('id')(cls.prototype, methodName, 0);
        Req()(cls.prototype, methodName, 1);
      };

  return {
    methodName,
    route,
    name,
    handler,
    paramDecorators,
    httpVerbDecorator: Get,
    apiSummary: `Get one ${name} by id`,
    apiResponses: [
      (t, k, d) => ApiParam(ctx.idParamMeta)(t, k, d),
      (t, k, d) => ApiResponse({
        status: 200,
        description: `The ${name}`,
        ...(ctx.oneSchema && { schema: toJsonSchema(ctx.oneSchema) }),
      })(t, k, d),
      (t, k, d) => ApiNotFoundResponse({ description: 'Not found' })(t, k, d),
    ],
    op: 'findOne',
  };
};

/** Register `GET /:id`. No-ops when `findOne` is disabled. */
export const registerFindOne = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const spec = describeFindOne(ctx, sub);
  if (!spec) return;
  registerOperation(ctx, spec, sub);
};
