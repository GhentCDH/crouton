import { Body, Param, Post, Req } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import type { OperationContext } from './operation-context';
import type { CrudRepository } from '../crud-repository.factory';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import { isOpEnabled, registerOperation, type OperationSpec } from './operation-registrar';

const describeCreate = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): OperationSpec | null => {
  if (!isOpEnabled(ctx, 'create', sub)) return null;

  const { cls, config, createSchema, bodyDecorator } = ctx;
  const methodName = sub ? `createChild_${sub.childRoute}` : 'create';
  const route = sub ? `:id/${sub.childRoute}` : '';
  const name = sub ? sub.childRoute : config.name;

  const handler = sub
    ? async function (
        this: { repo: CrudRepository },
        id: string,
        body: any,
        req: any,
      ) {
        return this.repo.createChild(id, sub, body, req);
      }
    : function (this: { repo: CrudRepository }, body: any, req: any) {
        return this.repo.create(body, req);
      };

  const paramDecorators = sub
    ? () => {
        Param('id')(cls.prototype, methodName, 0);
        Body()(cls.prototype, methodName, 1);
        Req()(cls.prototype, methodName, 2);
      }
    : () => {
        bodyDecorator(createSchema, { coerceNullableUndefinedToNull: true })(cls.prototype, methodName, 0);
        Req()(cls.prototype, methodName, 1);
      };

  return {
    methodName,
    route,
    name,
    handler,
    paramDecorators,
    httpVerbDecorator: Post,
    apiSummary: `Create a ${name}`,
    apiResponses: [
      (t, k, d) => ApiResponse({ status: 201, description: `${name} created` })(t, k, d),
    ],
    op: 'create',
  };
};

/** Register `POST /`. Applies Zod body validation when the create schema is a Zod schema. No-ops when `create` is disabled. */
export const registerCreate = (
  ctx: OperationContext,
  sub?: SubResourceConfig,
): void => {
  const spec = describeCreate(ctx, sub);
  if (!spec) return;
  registerOperation(ctx, spec, sub);
};
