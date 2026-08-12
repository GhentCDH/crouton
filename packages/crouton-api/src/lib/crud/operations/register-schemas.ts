import { Get } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';
import {
  buildSubResourceOperations,
  buildViewsPayload,
  resolveActions,
} from './payload-builders';
import { IS_DEV } from '../dev-mode';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import type { ResourceConfigRegistry } from '../resource-config.registry';

const defaultSchemas = (ctx: OperationContext) => {
  const { config, baseUrl } = ctx;
  const { route, name } = config;
  const viewsPayload = buildViewsPayload(config, baseUrl);

  return {
    route: 'schemas',
    methodName: 'getSchemas',
    name,
    schemasFn: async function (this: { configRegistry: ResourceConfigRegistry }) {
      if (IS_DEV) {
        const fresh = await this.configRegistry.getByRoute(route);
        if (fresh) return buildViewsPayload(fresh, baseUrl) ?? viewsPayload;
      }
      return viewsPayload;
    },
    decorators: () => {
      //
    },
  };
};

export const childSchemas =
  (sub: SubResourceConfig) => (ctx: OperationContext) => {
    if (!sub.views) return null;
    const { config, baseUrl } = ctx;
    const { route } = config;
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

    return {
      route: `${sub.childRoute}/schemas`,
      methodName: `getSchemas_${sub.childRoute}`,
      name: sub.childRoute,
      schemasFn: async function () {
        return schemasPayload;
      },
      decorators: () => {
        //
      },
    };
  };

/** Register `GET /schemas`. */
export const registerSchemas = (
  ctx: OperationContext,
  operationFn = defaultSchemas,
): void => {
  const properties = operationFn(ctx);
  if (!properties) return;

  const { methodName, route, name } = properties;
  const { cls } = ctx;

  def(cls, methodName, properties.schemasFn);
  const d = desc(cls, methodName);
  Get(route)(cls.prototype, methodName, d);
  ApiOperation({ summary: `Get view schemas for ${name}` })(
    cls.prototype,
    methodName,
    d,
  );
  ApiResponse({ status: 200, description: `View schemas for ${name}` })(
    cls.prototype,
    methodName,
    d,
  );

  properties.decorators();
};