import { Body, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import type { CrudRepository } from '../crud-repository.factory';
import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';
import { buildSubResourceOperations, resolveActions } from './payload-builders';
import type { SubResourceConfig } from '../resource/SubResource.schema';

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
    id: `${route}/${sub.childRoute}`,
    name: sub.name ?? sub.childRoute,
    route: sub.childRoute,
    uri: childUri,
    title: sub.title ?? sub.childRoute,
    idField: sub.idField ?? 'id',
    idType: sub.idType ?? 'string',
    ...(sub.modalSize && { modalSize: sub.modalSize }),
    operations: buildSubResourceOperations(
      sub.operations,
      childUri,
      sub.idField ?? 'id',
    ),
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
    actions: resolveActions(`${baseUrl}/${sub.childRoute}`, sub.actions),
  };

  def(cls, methodName, async function () {
    return schemasPayload;
  });
  const ds = desc(cls, methodName);
  Get(`${sub.childRoute}/schemas`)(cls.prototype, methodName, ds);
  ApiOperation({ summary: `Get schemas for ${sub.childRoute}` })(
    cls.prototype,
    methodName,
    ds,
  );
  ApiResponse({
    status: 200,
    description: `View schemas for ${sub.childRoute}`,
  })(cls.prototype, methodName, ds);
};

// ── Sub-resource create route ─────────────────────────────────────────────

/** Register `POST /:id/<child>` — create a child resource. */
const registerSubResourceCreate = (
  ctx: OperationContext,
  sub: SubResourceConfig,
): void => {
  if (!sub.operations?.create) return;
  const { cls, config } = ctx;
  const { name } = config;
  const methodName = `createChild_${sub.childRoute}`;

  def(
    cls,
    methodName,
    async function (this: { repo: CrudRepository }, id: string, body: any) {
      return this.repo.createChild(id, sub, body);
    },
  );
  const d = desc(cls, methodName);
  Post(`:id/${sub.childRoute}`)(cls.prototype, methodName, d);
  Param('id')(cls.prototype, methodName, 0);
  Body()(cls.prototype, methodName, 1);
  ApiOperation({ summary: `Create ${sub.childRoute} for a ${name}` })(
    cls.prototype,
    methodName,
    d,
  );
  ApiParam(ctx.idParamMeta)(cls.prototype, methodName, d);
  ApiResponse({ status: 201, description: `${sub.childRoute} created` })(
    cls.prototype,
    methodName,
    d,
  );
};

// ── Sub-resource route orchestration ──────────────────────────────────────

export const registerSubResourceRoute = (
  ctx: OperationContext,
  sub: SubResourceConfig,
): void => {
  registerSubResourceSchemas(ctx, sub);
  registerSubResourceCreate(ctx, sub);
};