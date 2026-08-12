import { Body, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';
import type { CrudRepository } from '../crud-repository.factory';
import { isOperationEnabled } from '../crud.config';
import type { SubResourceConfig } from '../resource/SubResource.schema';

const defaultCreate = (ctx: OperationContext) => {
  if (!isOperationEnabled(ctx.definition, 'create')) return null;
  const { cls, config, createSchema, bodyDecorator } = ctx;
  const methodName = 'create';

  return {
    route: '',
    methodName,
    name: config.name,
    createFn: function (this: { repo: CrudRepository }, body: any) {
      return this.repo.create(body);
    },
    decorators: () => {
      bodyDecorator(createSchema, { coerceNullableUndefinedToNull: true })(
        cls.prototype,
        methodName,
        0,
      );
    },
  };
};

const childCreate = (sub: SubResourceConfig) => (ctx: OperationContext) => {
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
  sub?: SubResourceConfig,
): void => {
  const operationFn = sub ? childCreate(sub) : defaultCreate;
  const properties = operationFn(ctx);
  if (!properties) return;

  const { methodName, route, name } = properties;
  const { cls } = ctx;

  def(cls, methodName, properties.createFn);
  const d = desc(cls, methodName);
  Post(route)(cls.prototype, methodName, d);
  ApiOperation({ summary: `Create a ${name}` })(cls.prototype, methodName, d);
  ApiResponse({ status: 201, description: `${name} created` })(
    cls.prototype,
    methodName,
    d,
  );

  properties.decorators();
};
