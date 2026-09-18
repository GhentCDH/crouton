import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import type { CrudOperation } from '../crud.config';
import { isOperationEnabled, isOperationExternal } from '../crud.config';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';

export type OperationSpec = {
  methodName: string;
  route: string;
  name: string;
  handler: (...args: any[]) => any;
  paramDecorators: () => void;
  httpVerbDecorator: (route: string) => MethodDecorator;
  apiSummary: string;
  apiResponses: Array<(target: any, key: string, d: PropertyDescriptor) => void>;
  op: CrudOperation;
};

/** Returns true when the operation should be registered (handles the root vs child enabled check). */
export const isOpEnabled = (
  ctx: OperationContext,
  op: CrudOperation,
  sub?: SubResourceConfig,
): boolean => {
  if (sub) return isOperationEnabled(sub.operations, op);
  return isOperationEnabled(ctx.definition, op) && !isOperationExternal(ctx.definition, op);
};

export const registerOperation = (
  ctx: OperationContext,
  spec: OperationSpec,
  sub?: SubResourceConfig,
): void => {
  const { methodName, route, handler, paramDecorators, httpVerbDecorator, apiSummary, apiResponses, op } = spec;
  const { cls } = ctx;
  def(cls, methodName, handler);
  const d = desc(cls, methodName);
  (httpVerbDecorator(route) as any)(cls.prototype, methodName, d);
  ApiOperation({ summary: apiSummary })(cls.prototype, methodName, d);
  for (const r of apiResponses) r(cls.prototype, methodName, d);
  paramDecorators();
  ctx.secure(methodName, op, sub);
};
