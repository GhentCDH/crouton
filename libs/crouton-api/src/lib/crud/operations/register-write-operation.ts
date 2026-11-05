import { Body, Param, Req } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { isOperationEnabled } from '@ghentcdh/crouton-core';

import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';
import type { CrudRepository } from '../data-access/repository';
import type { SubResourceConfig } from '../resource/SubResource.schema';

export interface WriteOperationSpec {
  /** HTTP decorator factory, e.g. `Put` or `Patch`. */
  verb: (route: string) => MethodDecorator;
  operation: 'patch' | 'update';
  methodName: string;
  route: string;
  handler: unknown;
  decorators: () => void;
  summary: string;
  description: string;
}

/**
 * Build the handler/route/decorators for a child write route
 * (`PATCH|PUT /:id/<child>/:childId`). `registerPatch` and `registerUpdate`
 * kept identical copies of this, differing only in the method-name prefix and
 * the operation key.
 */
export const childWriteProperties = (
  ctx: OperationContext,
  sub: SubResourceConfig,
  operation: 'patch' | 'update',
) => {
  if (!isOperationEnabled(sub.operations, operation)) return null;
  const { cls } = ctx;
  const methodName = `${operation}Child_${sub.childRoute}`;

  const handler = async function (
    this: { repo: CrudRepository },
    _id: string,
    childId: string,
    body: unknown,
    req: unknown,
  ) {
    return this.repo.updateChild(sub, childId, body, req);
  };

  const decorators = () => {
    Param('id')(cls.prototype, methodName, 0);
    Param('childId')(cls.prototype, methodName, 1);
    Body()(cls.prototype, methodName, 2);
    Req()(cls.prototype, methodName, 3);
  };

  return {
    route: `:id/${sub.childRoute}/:childId`,
    methodName,
    name: sub.childRoute,
    handler,
    decorators,
  };
};

/**
 * Register a write route (`PUT`/`PATCH`, parent or child) and its Swagger
 * metadata. `registerUpdate` and `registerPatch` had identical bodies apart
 * from the verb, operation key and wording.
 */
export const registerWriteOperation = (
  ctx: OperationContext,
  spec: WriteOperationSpec,
  sub?: SubResourceConfig,
): void => {
  const { cls } = ctx;

  def(cls, spec.methodName, spec.handler);
  const d = desc(cls, spec.methodName);
  spec.verb(spec.route)(cls.prototype, spec.methodName, d);
  ApiOperation({ summary: spec.summary })(cls.prototype, spec.methodName, d);
  ApiResponse({ status: 200, description: spec.description })(
    cls.prototype,
    spec.methodName,
    d,
  );
  ApiNotFoundResponse({ description: 'Not found' })(
    cls.prototype,
    spec.methodName,
    d,
  );

  spec.decorators();
  ctx.secure(spec.methodName, spec.operation, sub);
};
