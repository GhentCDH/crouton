import { Delete, Param, Req } from '@nestjs/common';
import { ApiParam, ApiResponse } from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import type { CrudRepository } from '../crud-repository.factory';
import { type SubResourceConfig } from '../resource/SubResource.schema';
import { isOpEnabled, registerOperation, type OperationSpec } from './operation-registrar';

const describeDelete = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): OperationSpec | null => {
  if (!isOpEnabled(ctx, 'delete', sub)) return null;

  const { cls, config } = ctx;
  const methodName = sub ? `deleteChild_${sub.childRoute}` : 'delete';
  const route = sub ? `:id/${sub.childRoute}/:childId` : ':id';
  const name = sub ? sub.childRoute : config.name;

  const handler = sub
    ? async function (
        this: { repo: CrudRepository },
        childId: string,
        parentId: string,
        req: any,
      ) {
        return this.repo.deleteChild(sub, childId, parentId, req);
      }
    : function (this: { repo: CrudRepository }, id: string, req: any) {
        return this.repo.delete(id, req);
      };

  const paramDecorators = sub
    ? () => {
        Param('childId')(cls.prototype, methodName, 0);
        // The parent id was declared but never bound, so `parentId` always
        // arrived undefined and the foreign-key guard in `deleteChild` — the one
        // that is supposed to prevent cross-parent deletions — never engaged.
        Param('id')(cls.prototype, methodName, 1);
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
    httpVerbDecorator: Delete,
    apiSummary: `Delete ${name} record`,
    apiResponses: [
      (t, k, d) => ApiParam(ctx.idParamMeta)(t, k, d),
      (t, k, d) => ApiResponse({ status: 200 })(t, k, d),
    ],
    op: 'delete',
  };
};

/** Register `DELETE /:id`. No-ops when `delete` is disabled. */
export const registerDelete = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const spec = describeDelete(ctx, sub);
  if (!spec) return;
  registerOperation(ctx, spec, sub);
};
