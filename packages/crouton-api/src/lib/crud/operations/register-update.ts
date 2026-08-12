import { Body, Param, Put } from '@nestjs/common';
import {
  ApiBody,
  type ApiBodyOptions,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import { isOperationEnabled } from '../crud.config';
import { def, desc } from './decorator.utils';
import type { CrudRepository } from '../crud-repository.factory';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import { toJsonSchema } from '../schema.utils';

/** Swagger's SchemaObject is not exported from the package root — derive it from ApiBodyOptions. */
type SchemaObject = NonNullable<
  Extract<ApiBodyOptions, { schema?: unknown }>['schema']
>;

const defaultUpdate = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'update')) return null;
  const { config } = ctx;
  const methodName = 'update';

  return {
    route: ':id',
    methodName,
    name: config.name,
    updateFn: function (
      this: { repo: CrudRepository },
      id: string,
      body: any,
    ) {
      return this.repo.update(id, body);
    },
    decorators: () => {
      //
    },
  };
};

export const childUpdate =
  (sub: SubResourceConfig) => (ctx: OperationContext) => {
    if (!isOperationEnabled(sub.operations, 'update')) return null;
    const { cls } = ctx;
    const methodName = `updateChild_${sub.childRoute}`;

    const updateFn = async function (
      this: { repo: CrudRepository },
      _id: string,
      childId: string,
      body: any,
    ) {
      return this.repo.updateChild(sub, childId, body);
    };

    const decorators = () => {
      Param('childId')(cls.prototype, methodName, 1);
      Body()(cls.prototype, methodName, 2);
    };

    return {
      route: `:id/${sub.childRoute}/:childId`,
      methodName,
      name: sub.childRoute,
      updateFn,
      decorators,
    };
  };

/** Register `PUT /:id`. No-ops when `update` is disabled. */
export const registerUpdate = (
  ctx: OperationContext,
  operationFn = defaultUpdate,
): void => {
  const properties = operationFn(ctx);
  if (!properties) return;

  const { methodName, route, name } = properties;
  const { cls, updateSchema, idParamMeta, bodyDecorator } = ctx;

  def(cls, methodName, properties.updateFn);
  const d = desc(cls, methodName);
  Put(route)(cls.prototype, methodName, d);
  Param('id')(cls.prototype, methodName, 0);
  bodyDecorator(updateSchema)(cls.prototype, methodName, 1);
  ApiOperation({ summary: `Replace a ${name}` })(cls.prototype, methodName, d);
  ApiParam(idParamMeta)(cls.prototype, methodName, d);
  if (updateSchema)
    ApiBody({ schema: toJsonSchema(updateSchema) as SchemaObject })(
      cls.prototype,
      methodName,
      d,
    );
  ApiResponse({ status: 200, description: `${name} replaced` })(
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