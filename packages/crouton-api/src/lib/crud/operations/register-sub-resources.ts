import { Body, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import type { CrudRepository } from '../crud-repository.factory';
import { RequestDtoNoOffset } from '../request.dto';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';
import { buildSubResourceOperations, resolveEnvPlaceholders } from './payload-builders';

// ── Sub-resource handlers ─────────────────────────────────────────────────

const findAllByParent = async (repo: CrudRepository, id: string, childRoute: string, params: any) => {
  const { data, count } = await repo.findAllByParent(id, childRoute, params);
  const totalPages = Math.max(1, Math.ceil(count / params.pageSize));
  return {
    data,
    request: { count, page: params.page, pageSize: params.pageSize, totalPages, sort: params.sort, sortDir: params.sortDir, filter: params.filter },
  };
};

const createChild = async (repo: CrudRepository, id: string, sub: SubResourceConfig, body: any) => {
  return repo.createChild(id, sub, body);
};

const findOneChild = async (repo: CrudRepository, sub: SubResourceConfig, childId: string, parentId: string) => {
  return repo.findOneChild(sub, childId, parentId);
};

const updateChild = async (repo: CrudRepository, sub: SubResourceConfig, childId: string, body: any) => {
  return repo.updateChild(sub, childId, body);
};

const deleteChild = async (repo: CrudRepository, sub: SubResourceConfig, childId: string, parentId: string) => {
  return repo.deleteChild(sub, childId, parentId);
};

// ── Sub-resource schemas endpoint ─────────────────────────────────────────

const registerSubResourceSchemas = (
  ctx: OperationContext,
  sub: SubResourceConfig,
): void => {
  if (!sub.views) return;
  const { cls, config, baseUrl } = ctx;
  const { route } = config;
  const methodName = `getSchemas_${sub.childRoute}`;
  const childUri = `${baseUrl}/${route}/{parent.id}/${sub.childRoute}`;

  const schemasPayload = {
    id: sub.name ?? sub.childRoute,
    name: sub.name ?? sub.childRoute,
    route: sub.childRoute,
    uri: childUri,
    title: sub.title ?? sub.childRoute,
    idField: sub.idField ?? 'id',
    idType: sub.idType ?? 'string',
    ...(sub.modalSize && { modalSize: sub.modalSize }),
    operations: buildSubResourceOperations(sub.operations, childUri, sub.idField ?? 'id'),
    schemas: Object.fromEntries(
      Object.entries(sub.views).map(([key, v]) => [
        key,
        {
          data: v.json_schema,
          ui: v.ui_schema,
          ...(v.defaultSort !== undefined && { defaultSort: v.defaultSort }),
        },
      ]),
    ),
    ...(sub.actions?.length && {
      actions: sub.actions.map((a) =>
        a.type === 'link'
          ? { type: 'link', id: a.id, label: a.label, href: resolveEnvPlaceholders(a.href), ...(a.condition && { condition: a.condition }) }
          : {
              id: a.id,
              label: a.label,
              uri: `${baseUrl}/${sub.childRoute}/procedure/${a.id}/{id}`,
              method: a.method ?? 'post',
              ...(a.data && { data: a.data }),
              ...(a.condition && { condition: a.condition }),
            },
      ),
    }),
  };

  def(cls, methodName, async function () { return schemasPayload; });
  const ds = desc(cls, methodName);
  Get(`${sub.childRoute}/schemas`)(cls.prototype, methodName, ds);
  ApiOperation({ summary: `Get schemas for ${sub.childRoute}` })(cls.prototype, methodName, ds);
  ApiResponse({ status: 200, description: `View schemas for ${sub.childRoute}` })(cls.prototype, methodName, ds);
};

// ── Sub-resource CRUD routes ──────────────────────────────────────────────

/** Register `GET /:id/<child>` — paginated list of child resources. */
const registerSubResourceFindAll = (ctx: OperationContext, sub: SubResourceConfig): void => {
  if (sub.operations?.findAll === false) return;
  const { cls, config } = ctx;
  const { name } = config;
  const idParamMeta = ctx.idParamMeta;
  const methodName = `findAllBy_${sub.childRoute}`;

  def(cls, methodName, async function (this: { repo: CrudRepository }, id: string, params: any) {
    return findAllByParent(this.repo, id, sub.childRoute, params);
  });
  const d = desc(cls, methodName);
  Get(`:id/${sub.childRoute}`)(cls.prototype, methodName, d);
  Param('id')(cls.prototype, methodName, 0);
  Query(new ZodValidationPipe(RequestDtoNoOffset.zodSchema as any))(cls.prototype, methodName, 1);
  ApiOperation({ summary: `List ${sub.childRoute} for a ${name}` })(cls.prototype, methodName, d);
  ApiParam(idParamMeta)(cls.prototype, methodName, d);
  ApiResponse({ status: 200, description: `${sub.childRoute} list` })(cls.prototype, methodName, d);
};

/** Register `POST /:id/<child>` — create a child resource. */
const registerSubResourceCreate = (ctx: OperationContext, sub: SubResourceConfig): void => {
  if (!sub.operations?.create) return;
  const { cls, config } = ctx;
  const { name } = config;
  const methodName = `createChild_${sub.childRoute}`;

  def(cls, methodName, async function (this: { repo: CrudRepository }, id: string, body: any) {
    return createChild(this.repo, id, sub, body);
  });
  const d = desc(cls, methodName);
  Post(`:id/${sub.childRoute}`)(cls.prototype, methodName, d);
  Param('id')(cls.prototype, methodName, 0);
  Body()(cls.prototype, methodName, 1);
  ApiOperation({ summary: `Create ${sub.childRoute} for a ${name}` })(cls.prototype, methodName, d);
  ApiParam(ctx.idParamMeta)(cls.prototype, methodName, d);
  ApiResponse({ status: 201, description: `${sub.childRoute} created` })(cls.prototype, methodName, d);
};

/** Register `GET /:id/<child>/:childId` — fetch single child resource. */
const registerSubResourceFindOne = (ctx: OperationContext, sub: SubResourceConfig): void => {
  if (!sub.operations?.findOne) return;
  const { cls } = ctx;
  const methodName = `findOneChild_${sub.childRoute}`;

  def(cls, methodName, async function (this: { repo: CrudRepository }, parentId: string, childId: string) {
    return findOneChild(this.repo, sub, childId, parentId);
  });
  const d = desc(cls, methodName);
  Get(`:id/${sub.childRoute}/:childId`)(cls.prototype, methodName, d);
  Param('id')(cls.prototype, methodName, 0);
  Param('childId')(cls.prototype, methodName, 1);
  ApiOperation({ summary: `Get a ${sub.childRoute} record` })(cls.prototype, methodName, d);
  ApiParam(ctx.idParamMeta)(cls.prototype, methodName, d);
  ApiResponse({ status: 200, description: `${sub.childRoute} record` })(cls.prototype, methodName, d);
};

/** Register `PATCH /:id/<child>/:childId` — update a child resource. */
const registerSubResourceUpdate = (ctx: OperationContext, sub: SubResourceConfig): void => {
  if (!sub.operations?.update) return;
  const { cls } = ctx;
  const methodName = `updateChild_${sub.childRoute}`;

  def(cls, methodName, async function (this: { repo: CrudRepository }, _id: string, childId: string, body: any) {
    return updateChild(this.repo, sub, childId, body);
  });
  const d = desc(cls, methodName);
  Patch(`:id/${sub.childRoute}/:childId`)(cls.prototype, methodName, d);
  Param('id')(cls.prototype, methodName, 0);
  Param('childId')(cls.prototype, methodName, 1);
  Body()(cls.prototype, methodName, 2);
  ApiOperation({ summary: `Update a ${sub.childRoute} record` })(cls.prototype, methodName, d);
  ApiParam(ctx.idParamMeta)(cls.prototype, methodName, d);
  ApiResponse({ status: 200, description: `${sub.childRoute} updated` })(cls.prototype, methodName, d);
};

/** Register `DELETE /:id/<child>/:childId` — delete a child resource. */
const registerSubResourceDelete = (ctx: OperationContext, sub: SubResourceConfig): void => {
  if (!sub.operations?.delete) return;
  const { cls } = ctx;
  const methodName = `deleteChild_${sub.childRoute}`;

  def(cls, methodName, async function (this: { repo: CrudRepository }, parentId: string, childId: string) {
    return deleteChild(this.repo, sub, childId, parentId);
  });
  const d = desc(cls, methodName);
  Delete(`:id/${sub.childRoute}/:childId`)(cls.prototype, methodName, d);
  Param('id')(cls.prototype, methodName, 0);
  Param('childId')(cls.prototype, methodName, 1);
  ApiOperation({ summary: `Delete ${sub.childRoute} record` })(cls.prototype, methodName, d);
  ApiParam(ctx.idParamMeta)(cls.prototype, methodName, d);
  ApiResponse({ status: 200, description: `${sub.childRoute} deleted` })(cls.prototype, methodName, d);
};

/** Register all routes for all sub-resources (schemas endpoint + CRUD). */
export const registerSubResourceRoutes = (ctx: OperationContext): void => {
  for (const sub of ctx.config.subResources ?? []) {
    registerSubResourceSchemas(ctx, sub);
    registerSubResourceFindAll(ctx, sub);
    registerSubResourceCreate(ctx, sub);
    registerSubResourceFindOne(ctx, sub);
    registerSubResourceUpdate(ctx, sub);
    registerSubResourceDelete(ctx, sub);
  }
};