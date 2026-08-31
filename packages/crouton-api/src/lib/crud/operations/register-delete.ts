import { Delete, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import { isOperationEnabled } from '../crud.config';
import { def, desc } from './decorator.utils';
import type { CrudRepository } from '../crud-repository.factory';
import { type SubResourceConfig } from '../resource/SubResource.schema';

const defaultDelete = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'delete')) return null;
  const { config } = ctx;
  const methodName = 'delete';
  const { name } = config;

  return {
    route: ':id',
    methodName,
    name,
    decorators: () => {
      //
    },
    deleteFn: function (this: { repo: CrudRepository }, id: string, req: any) {
      return this.repo.delete(id, req);
    },
  };
};

export const deleteChild =
  (sub: SubResourceConfig) => (ctx: OperationContext) => {
    if (!isOperationEnabled(sub.operations, 'delete')) return null;
    const { cls } = ctx;
    const methodName = `deleteChild_${sub.childRoute}`;

    const deleteFn = async function (
      this: { repo: CrudRepository },
      childId: string,
      parentId: string,
      req: any,
    ) {
      return this.repo.deleteChild(sub, childId, parentId, req);
    };

    const decorators = () => {
      Param('childId')(cls.prototype, methodName, 0);
      // The parent id was declared but never bound, so `parentId` always
      // arrived undefined and the foreign-key guard in `deleteChild` — the one
      // that is supposed to prevent cross-parent deletions — never engaged.
      Param('id')(cls.prototype, methodName, 1);
      Req()(cls.prototype, methodName, 2);
    };
    return {
      route: `:id/${sub.childRoute}/:childId`,
      methodName,
      name: sub.childRoute,
      deleteFn,
      decorators,
    };
  };

/** Register `DELETE /:id`. No-ops when `delete` is disabled. */
export const registerDelete = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const operationFn = sub ? deleteChild(sub) : defaultDelete;
  const { cls } = ctx;

  const properties = operationFn(ctx);
  if (!properties) return;
  const { methodName, route, name } = properties;

  def(cls, methodName, properties.deleteFn);
  const d = desc(cls, methodName);
  Delete(route)(cls.prototype, methodName, d);
  Param('id')(cls.prototype, methodName, 0);
  ApiOperation({ summary: `Delete ${name} record` })(
    cls.prototype,
    methodName,
    d,
  );
  ApiParam(ctx.idParamMeta)(cls.prototype, methodName, d);
  ApiResponse({ status: 200 })(cls.prototype, methodName, d);
  properties.decorators();
  if (!sub) Req()(cls.prototype, methodName, 1);
  ctx.secure(methodName, 'delete', sub);
};
