import { Body, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  type ApiBodyOptions,
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

const defaultCreate = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'create')) return null;
  const { config } = ctx;
  const methodName = 'create';

  return {
    route: '',
    methodName,
    name: config.name,
    createFn: function (this: { repo: CrudRepository }, body: any) {
      return this.repo.create(body);
    },
    decorators: () => {
      //
    },
  };
};

export const childCreate =
  (sub: SubResourceConfig) => (ctx: OperationContext) => {
    if (!isOperationEnabled(sub.operations, 'create')) return null;
    const { cls } = ctx;
    const methodName = `createChild_${sub.childRoute}`;

    const createFn = async function (
      this: { repo: CrudRepository },
      id: string,
      body: any,
    ) {
      return this.repo.createChild(id, sub, body);
    };

    const decorators = () => {
      Param('id')(cls.prototype, methodName, 0);
      Body()(cls.prototype, methodName, 1);
    };

    return {
      route: `:id/${sub.childRoute}`,
      methodName,
      name: sub.childRoute,
      createFn,
      decorators,
    };
  };

/** Register `POST /`. Applies Zod body validation when the create schema is a Zod schema. No-ops when `create` is disabled. */
export const registerCreate = (
  ctx: OperationContext,
  operationFn = defaultCreate,
): void => {
  const properties = operationFn(ctx);
  if (!properties) return;

  const { methodName, route, name } = properties;
  const { cls, createSchema, bodyDecorator } = ctx;

  def(cls, methodName, properties.createFn);
  const d = desc(cls, methodName);
  Post(route)(cls.prototype, methodName, d);
  bodyDecorator(createSchema, { coerceNullableUndefinedToNull: true })(
    cls.prototype,
    methodName,
    0,
  );
  ApiOperation({ summary: `Create a ${name}` })(cls.prototype, methodName, d);
  if (createSchema)
    ApiBody({ schema: toJsonSchema(createSchema) as SchemaObject })(
      cls.prototype,
      methodName,
      d,
    );
  ApiResponse({ status: 201, description: `${name} created` })(
    cls.prototype,
    methodName,
    d,
  );
  ApiParam(ctx.idParamMeta)(cls.prototype, methodName, d);

  properties.decorators();
};