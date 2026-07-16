import { Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  ApiBody,
  type ApiBodyOptions,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import type { CrudRepository } from '../crud-repository.factory';
import { isOperationEnabled } from '../crud.config';
import { RequestDtoNoOffset } from '../request.dto';
import { toJsonSchema } from '../schema.utils';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';

/** Swagger's SchemaObject is not exported from the package root — derive it from ApiBodyOptions. */
type SchemaObject = NonNullable<Extract<ApiBodyOptions, { schema?: unknown }>['schema']>;

// ── CRUD handlers ─────────────────────────────────────────────────────────

const findAll = async (repo: CrudRepository, params: any, q: string | undefined, lookupLabel: string | undefined) => {
  const effectiveParams = { ...params };
  if (q && lookupLabel) {
    effectiveParams.filter = [...(params.filter ?? []), `${lookupLabel}:${q}`];
  }
  const [data, count] = await Promise.all([
    repo.findAll(effectiveParams),
    repo.count(effectiveParams.filter),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / params.pageSize));
  return {
    data,
    request: { count, page: params.page, pageSize: params.pageSize, totalPages, sort: params.sort, sortDir: params.sortDir, filter: params.filter },
  };
};

const findOne = async (repo: CrudRepository, id: string) => {
  return repo.findOne(id);
};

const create = async (repo: CrudRepository, body: any) => {
  return repo.create(body);
};

const update = async (repo: CrudRepository, id: string, body: any) => {
  return repo.update(id, body);
};

const patch = async (repo: CrudRepository, id: string, body: any) => {
  return repo.patch(id, body);
};

const upsert = async (repo: CrudRepository, body: any) => {
  return repo.upsert(body);
};

const del = async (repo: CrudRepository, id: string) => {
  return repo.delete(id);
};

// ── CRUD registration ─────────────────────────────────────────────────────

/**
 * Register `GET /` with pagination, sorting, filtering, and optional `?q=` lookup search.
 * No-ops when `findAll` is disabled in the resource config.
 */
export const registerFindAll = (ctx: OperationContext): void => {
  if (!isOperationEnabled(ctx.definition, 'findAll')) return;
  const { cls, config, listSchema } = ctx;
  const { name } = config;
  const lookupLabel = config.lookup?.label;

  def(cls, 'findAll', async function (this: { repo: CrudRepository }, params: any, q?: string) {
    return findAll(this.repo, params, q, lookupLabel);
  });
  const d = desc(cls, 'findAll');
  Get()(cls.prototype, 'findAll', d);
  Query(new ZodValidationPipe(RequestDtoNoOffset.zodSchema as any))(cls.prototype, 'findAll', 0);
  Query('q')(cls.prototype, 'findAll', 1);
  ApiOperation({ summary: `List all ${name}s` })(cls.prototype, 'findAll', d);
  ApiResponse({
    status: 200,
    description: `Array of ${name}`,
    ...(listSchema && { schema: { type: 'array', items: toJsonSchema(listSchema) } }),
  })(cls.prototype, 'findAll', d);
};

/** Register `GET /:id`. No-ops when `findOne` is disabled. */
export const registerFindOne = (ctx: OperationContext): void => {
  if (!isOperationEnabled(ctx.definition, 'findOne')) return;
  const { cls, config, oneSchema, idParamMeta } = ctx;
  const { name } = config;

  def(cls, 'findOne', function (this: { repo: CrudRepository }, id: string) {
    return findOne(this.repo, id);
  });
  const d = desc(cls, 'findOne');
  Get(':id')(cls.prototype, 'findOne', d);
  Param('id')(cls.prototype, 'findOne', 0);
  ApiOperation({ summary: `Get one ${name} by id` })(cls.prototype, 'findOne', d);
  ApiParam(idParamMeta)(cls.prototype, 'findOne', d);
  ApiResponse({
    status: 200,
    description: `The ${name}`,
    ...(oneSchema && { schema: toJsonSchema(oneSchema) }),
  })(cls.prototype, 'findOne', d);
  ApiNotFoundResponse({ description: 'Not found' })(cls.prototype, 'findOne', d);
};

/** Register `POST /`. Applies Zod body validation when the create schema is a Zod schema. No-ops when `create` is disabled. */
export const registerCreate = (ctx: OperationContext): void => {
  if (!isOperationEnabled(ctx.definition, 'create')) return;
  const { cls, config, createSchema, bodyDecorator } = ctx;
  const { name } = config;

  def(cls, 'create', function (this: { repo: CrudRepository }, body: any) {
    return create(this.repo, body);
  });
  const d = desc(cls, 'create');
  Post()(cls.prototype, 'create', d);
  bodyDecorator(createSchema, { coerceNullableUndefinedToNull: true })(cls.prototype, 'create', 0);
  ApiOperation({ summary: `Create a ${name}` })(cls.prototype, 'create', d);
  if (createSchema) ApiBody({ schema: toJsonSchema(createSchema) as SchemaObject })(cls.prototype, 'create', d);
  ApiResponse({ status: 201, description: `${name} created` })(cls.prototype, 'create', d);
};

/** Register `PUT /:id`. Applies Zod body validation when the update schema is a Zod schema. No-ops when `update` is disabled. */
export const registerUpdate = (ctx: OperationContext): void => {
  if (!isOperationEnabled(ctx.definition, 'update')) return;
  const { cls, config, updateSchema, idParamMeta, bodyDecorator } = ctx;
  const { name } = config;

  def(cls, 'update', function (this: { repo: CrudRepository }, id: string, body: any) {
    return update(this.repo, id, body);
  });
  const d = desc(cls, 'update');
  Put(':id')(cls.prototype, 'update', d);
  Param('id')(cls.prototype, 'update', 0);
  bodyDecorator(updateSchema)(cls.prototype, 'update', 1);
  ApiOperation({ summary: `Replace a ${name}` })(cls.prototype, 'update', d);
  ApiParam(idParamMeta)(cls.prototype, 'update', d);
  if (updateSchema) ApiBody({ schema: toJsonSchema(updateSchema) as SchemaObject })(cls.prototype, 'update', d);
  ApiResponse({ status: 200, description: `${name} replaced` })(cls.prototype, 'update', d);
  ApiNotFoundResponse({ description: 'Not found' })(cls.prototype, 'update', d);
};

/** Register `PATCH /:id`. Applies Zod body validation when the patch schema is a Zod schema. No-ops when `patch` is disabled. */
export const registerPatch = (ctx: OperationContext): void => {
  if (!isOperationEnabled(ctx.definition, 'patch')) return;
  const { cls, config, patchSchema, idParamMeta, bodyDecorator } = ctx;
  const { name } = config;

  def(cls, 'patch', function (this: { repo: CrudRepository }, id: string, body: any) {
    return patch(this.repo, id, body);
  });
  const d = desc(cls, 'patch');
  Patch(':id')(cls.prototype, 'patch', d);
  Param('id')(cls.prototype, 'patch', 0);
  bodyDecorator(patchSchema)(cls.prototype, 'patch', 1);
  ApiOperation({ summary: `Update a ${name}` })(cls.prototype, 'patch', d);
  ApiParam(idParamMeta)(cls.prototype, 'patch', d);
  if (patchSchema) ApiBody({ schema: toJsonSchema(patchSchema) as SchemaObject })(cls.prototype, 'patch', d);
  ApiResponse({ status: 200, description: `${name} updated` })(cls.prototype, 'patch', d);
  ApiNotFoundResponse({ description: 'Not found' })(cls.prototype, 'patch', d);
};

/** Register `PUT /` for create-or-update. The `upsertOn` key(s) from the config determine the uniqueness constraint. No-ops when `upsert` is disabled. */
export const registerUpsert = (ctx: OperationContext): void => {
  if (!isOperationEnabled(ctx.definition, 'upsert')) return;
  const { cls, config, upsertSchema, bodyDecorator } = ctx;
  const { name } = config;

  def(cls, 'upsert', function (this: { repo: CrudRepository }, body: any) {
    return upsert(this.repo, body);
  });
  const d = desc(cls, 'upsert');
  Put()(cls.prototype, 'upsert', d);
  bodyDecorator(upsertSchema, { coerceNullableUndefinedToNull: true })(cls.prototype, 'upsert', 0);
  ApiOperation({ summary: `Upsert a ${name}` })(cls.prototype, 'upsert', d);
  if (upsertSchema) ApiBody({ schema: toJsonSchema(upsertSchema) as SchemaObject })(cls.prototype, 'upsert', d);
  ApiResponse({ status: 200, description: `${name} upserted` })(cls.prototype, 'upsert', d);
};

/** Register `DELETE /:id`. No-ops when `delete` is disabled. */
export const registerDelete = (ctx: OperationContext): void => {
  if (!isOperationEnabled(ctx.definition, 'delete')) return;
  const { cls, config, idParamMeta } = ctx;
  const { name } = config;

  def(cls, 'delete', function (this: { repo: CrudRepository }, id: string) {
    return del(this.repo, id);
  });
  const d = desc(cls, 'delete');
  Delete(':id')(cls.prototype, 'delete', d);
  Param('id')(cls.prototype, 'delete', 0);
  ApiOperation({ summary: `Delete a ${name}` })(cls.prototype, 'delete', d);
  ApiParam(idParamMeta)(cls.prototype, 'delete', d);
  ApiResponse({ status: 200, description: `${name} deleted` })(cls.prototype, 'delete', d);
  ApiNotFoundResponse({ description: 'Not found' })(cls.prototype, 'delete', d);
};