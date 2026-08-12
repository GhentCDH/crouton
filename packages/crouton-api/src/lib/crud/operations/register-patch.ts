import { Body, Param, Patch } from '@nestjs/common';
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

const defaultPatch = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'patch')) return null;
  const { config } = ctx;
  const methodName = 'patch';

  return {
    route: ':id',
    methodName,
    name: config.name,
    patchFn: function (
      this: { repo: CrudRepository },
      id: string,
      body: any,
    ) {
      return this.repo.patch(id, body);
    },
    decorators: () => {
      //
    },
  };
};

export const childPatch =
  (sub: SubResourceConfig) => (ctx: OperationContext) => {
    if (!isOperationEnabled(sub.operations, 'patch')) return null;
    const { cls } = ctx;
    const methodName = `patchChild_${sub.childRoute}`;

    const patchFn = async function (
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
      patchFn,
      decorators,
    };
  };

/** Register `PATCH /:id`. No-ops when `patch` is disabled. */
export const registerPatch = (
  ctx: OperationContext,
  operationFn = defaultPatch,
): void => {
  const properties = operationFn(ctx);
  if (!properties) return;

  const { methodName, route, name } = properties;
  const { cls, patchSchema, idParamMeta, bodyDecorator } = ctx;

  def(cls, methodName, properties.patchFn);
  const d = desc(cls, methodName);
  Patch(route)(cls.prototype, methodName, d);
  Param('id')(cls.prototype, methodName, 0);
  bodyDecorator(patchSchema)(cls.prototype, methodName, 1);
  ApiOperation({ summary: `Update a ${name}` })(cls.prototype, methodName, d);
  ApiParam(idParamMeta)(cls.prototype, methodName, d);
  if (patchSchema)
    ApiBody({ schema: toJsonSchema(patchSchema) as SchemaObject })(
      cls.prototype,
      methodName,
      d,
    );
  ApiResponse({ status: 200, description: `${name} updated` })(
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