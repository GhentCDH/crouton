import { Put } from '@nestjs/common';
import {
  ApiBody,
  type ApiBodyOptions,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import type { CrudRepository } from '../crud-repository.factory';
import { isOperationEnabled } from '../crud.config';
import { toJsonSchema } from '../schema.utils';
import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';

/** Swagger's SchemaObject is not exported from the package root — derive it from ApiBodyOptions. */
type SchemaObject = NonNullable<
  Extract<ApiBodyOptions, { schema?: unknown }>['schema']
>;

/** Register `PUT /` for create-or-update. The `upsertOn` key(s) from the config determine the uniqueness constraint. No-ops when `upsert` is disabled. */
export const registerUpsert = (ctx: OperationContext): void => {
  if (!isOperationEnabled(ctx.definition, 'upsert')) return;
  const { cls, config, upsertSchema, bodyDecorator } = ctx;
  const { name } = config;

  def(
    cls,
    'upsert',
    function (this: { repo: CrudRepository }, body: any) {
      return this.repo.upsert(body);
    },
  );
  const d = desc(cls, 'upsert');
  Put()(cls.prototype, 'upsert', d);
  bodyDecorator(upsertSchema, { coerceNullableUndefinedToNull: true })(
    cls.prototype,
    'upsert',
    0,
  );
  ApiOperation({ summary: `Upsert a ${name}` })(cls.prototype, 'upsert', d);
  if (upsertSchema)
    ApiBody({ schema: toJsonSchema(upsertSchema) as SchemaObject })(
      cls.prototype,
      'upsert',
      d,
    );
  ApiResponse({ status: 200, description: `${name} upserted` })(
    cls.prototype,
    'upsert',
    d,
  );
};