import { Delete, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import { isOperationEnabled } from '../crud.config';
import { def, desc } from './decorator.utils';
import type { CrudRepository } from '../crud-repository.factory';
import { type SubResourceConfig } from '../resource/SubResource.schema';

const defaultDelete = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'delete')) return null;
  const { cls, config } = ctx;
  const methodName = 'delete';
  const { name } = config;

  return {
    route: ':id',
    methodName,
    name,
    decorators: () => {
      //
    },
    deleteFn: function (this: { repo: CrudRepository }, id: string) {
      return this.repo.delete(id);
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
    ) {
      return this.repo.deleteChild(sub, childId, parentId);
    };

    const decorators = () => {
      Param('childId')(cls.prototype, methodName, 0);
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
  deleteFn = defaultDelete,
): void => {
  const { cls } = ctx;

  const properties = deleteFn(ctx);
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
};
