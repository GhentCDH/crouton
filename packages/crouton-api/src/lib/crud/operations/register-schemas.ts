import { Get, SetMetadata } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';
import {
  buildSubResourceViewsPayload,
  buildViewsPayload,
} from './payload-builders';
import { IS_DEV } from '../dev-mode';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import type { ResourceConfigRegistry } from '../resource-config.registry';
import { CROUTON_SECURITY } from '../security';
import { getRequestLanguage } from '../translation/language.context';

export const defaultSchemas = (ctx: OperationContext) => {
  const { config, baseUrl } = ctx;
  const { route, name } = config;
  const viewsPayload = buildViewsPayload(config, baseUrl);

  return {
    route: 'schemas',
    methodName: 'getSchemas',
    name,
    schemasFn: async function (this: {
      configRegistry: ResourceConfigRegistry;
    }) {
      const language = getRequestLanguage();
      if (IS_DEV || language) {
        const fresh = await this.configRegistry.getByRoute(route, language);
        if (fresh) return buildViewsPayload(fresh, baseUrl) ?? viewsPayload;
      }
      return viewsPayload;
    },
    decorators: () => {
      //
    },
  };
};

const childSchemas = (sub: SubResourceConfig) => (ctx: OperationContext) => {
  if (!sub.views) return null;
  const { config, baseUrl } = ctx;
  const schemasPayload = buildSubResourceViewsPayload(config, sub, baseUrl);

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
  sub?: SubResourceConfig,
): void => {
  const operationFn = sub ? childSchemas(sub) : defaultSchemas;
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

  // Schema endpoints follow resource-level global security.
  const sec = ctx.config.security ?? ctx.moduleDefaultSecurity;
  if (sec) {
    SetMetadata(CROUTON_SECURITY, sec)(cls.prototype, methodName, d);
  }
};
