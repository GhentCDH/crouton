import { Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';

import { CroutonValidationError } from '../crouton-validation.error';
import type { CrudRepository } from '../crud-repository.factory';
import { isOperationEnabled } from '../crud.config';
import {
  columnDbName,
  dbNameForId,
  findUniqueColumn,
  uniqueColumns,
} from '../unique-validation';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';

/** Query params for the uniqueness check. `value` arrives as a string from the URL. */
const UniqueQuerySchema = z.object({
  /** The column id to check (must be a declared-unique column). */
  field: z.string(),
  /** The candidate value. */
  value: z.string(),
  /** On edit, the id of the record being edited, so it does not match itself. */
  excludeId: z.string().optional(),
  /** JSON object of `{ scopeFieldId: value }` for composite (scoped) uniqueness. */
  scope: z.string().optional(),
});

/**
 * Register `GET /:route/unique?field=&value=&excludeId=` → `{ unique: boolean }`.
 *
 * Returns only a boolean (never the matching row), and refuses any `field` that
 * is not declared `unique` on the resource — so this cannot be used as a
 * generic existence/enumeration oracle. No-ops for custom (non-prisma)
 * resources, when `findAll` is disabled, or when no column is unique.
 */
export const registerUniqueCheck = (ctx: OperationContext): void => {
  const { cls, config } = ctx;
  if (!isOperationEnabled(ctx.definition, 'findAll')) return;
  if (!config.model) return;
  if (uniqueColumns(config).length === 0) return;

  const methodName = 'uniqueCheck';
  const idField = config.idField ?? 'id';
  const idType = config.idType ?? 'string';
  const modelName = config.model;

  const handler = async function (
    this: { repo: CrudRepository },
    query: z.infer<typeof UniqueQuerySchema>,
  ): Promise<{ unique: boolean }> {
    const { field, value, excludeId } = query;

    const entry = findUniqueColumn(config, field);
    if (!entry) {
      throw new CroutonValidationError([
        {
          field,
          message: `"${field}" is not a unique field`,
          code: 'unknown_field',
        },
      ]);
    }

    const dbName = columnDbName(entry.column);
    const where: Record<string, unknown> = {
      [dbName]: entry.unique.caseInsensitive
        ? { equals: value, mode: 'insensitive' }
        : value,
    };
    if (excludeId !== undefined && excludeId !== '') {
      where.NOT = {
        [idField]: idType === 'number' ? Number(excludeId) : String(excludeId),
      };
    }

    // Composite uniqueness: constrain the check to the same scope values.
    if (entry.unique.scope?.length && query.scope) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(query.scope) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      for (const scopeId of entry.unique.scope) {
        where[dbNameForId(config, scopeId)] = parsed[scopeId] ?? null;
      }
    }

    const model = (this.repo as { prisma?: Record<string, any> }).prisma?.[
      modelName
    ];
    // No queryable model (should not happen past the guard) → treat as free.
    if (!model) return { unique: true };

    const row = await model.findFirst({
      where,
      select: { [idField]: true },
    });
    return { unique: !row };
  };

  def(cls, methodName, handler);
  const d = desc(cls, methodName);
  Get('unique')(cls.prototype, methodName, d);
  Query(new ZodValidationPipe(UniqueQuerySchema as any))(
    cls.prototype,
    methodName,
    0,
  );
  ApiOperation({ summary: `Check whether a ${config.name} field value is unique` })(
    cls.prototype,
    methodName,
    d,
  );
  ApiResponse({
    status: 200,
    description: 'Uniqueness result',
    schema: {
      type: 'object',
      properties: { unique: { type: 'boolean' } },
    },
  })(cls.prototype, methodName, d);

  ctx.secure(methodName, 'findAll');
};
