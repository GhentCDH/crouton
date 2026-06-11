import { Post, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import type { CrudRepository } from '../crud-repository.factory';
import type { ResourceProcedureAction } from '../crud.config';
import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';

/**
 * Register a `POST /procedure/{action.id}/:recordId` route for each non-link action
 * declared in the resource config.
 */
export const registerActionRoutes = (ctx: OperationContext): void => {
  const { cls, config } = ctx;
  const { name } = config;
  const procedureActions = (config.actions ?? []).filter(
    (a): a is ResourceProcedureAction => a.type !== 'link',
  );

  for (const action of procedureActions) {
    const methodName = `procedure_${action.id}`;
    def(cls, methodName, async function (this: { repo: CrudRepository }, recordId: string) {
      return action.procedure(this.repo.prisma, recordId);
    });
    const d = desc(cls, methodName);
    Post(`procedure/${action.id}/:recordId`)(cls.prototype, methodName, d);
    Param('recordId')(cls.prototype, methodName, 0);
    ApiOperation({ summary: `Execute action "${action.label}" on a ${name}` })(cls.prototype, methodName, d);
    ApiParam({ name: 'recordId', type: 'string' })(cls.prototype, methodName, d);
    ApiResponse({ status: 200, description: `Action "${action.id}" result` })(cls.prototype, methodName, d);
  }
};
