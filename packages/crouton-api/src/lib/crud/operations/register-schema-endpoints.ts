import { Get } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { IS_DEV } from '../dev-mode';
import { ResourceConfigRegistry } from '../resource-config.registry';
import { def, desc } from './decorator.utils';
import {
  buildDefinitionPayload,
  buildResourceJsonPayload,
  buildViewsPayload,
} from './payload-builders';
import type { OperationContext } from './operation-context';

/**
 * Register `GET /definition` — returns the resource's enabled operations and JSON Schemas.
 * In dev mode the response is rebuilt from the live config registry on every request.
 */
export const registerDefinitionEndpoint = (ctx: OperationContext): void => {
  const { cls, config, baseUrl } = ctx;
  const { route, name } = config;
  const definitionPayload = buildDefinitionPayload(config);

  def(cls, 'getDefinition', async function (this: { configRegistry: ResourceConfigRegistry }) {
    if (IS_DEV) {
      const fresh = await this.configRegistry.getByRoute(route);
      if (fresh) return buildDefinitionPayload(fresh);
    }
    return definitionPayload;
  });
  const d = desc(cls, 'getDefinition');
  Get('definition')(cls.prototype, 'getDefinition', d);
  ApiOperation({ summary: `Get the resource definition for ${name}` })(cls.prototype, 'getDefinition', d);
  ApiResponse({ status: 200, description: `Definition (operations + schemas) for ${name}` })(cls.prototype, 'getDefinition', d);
};

/**
 * Register `GET /schemas` — returns view schemas (table/form) for the resource.
 * In dev mode the response is rebuilt from the live config registry on every request.
 */
export const registerSchemasEndpoint = (ctx: OperationContext): void => {
  const { cls, config, baseUrl } = ctx;
  const { route, name } = config;
  const viewsPayload = buildViewsPayload(config, baseUrl);

  def(cls, 'getSchemas', async function (this: { configRegistry: ResourceConfigRegistry }) {
    if (IS_DEV) {
      const fresh = await this.configRegistry.getByRoute(route);
      if (fresh) return buildViewsPayload(fresh, baseUrl) ?? viewsPayload;
    }
    return viewsPayload;
  });
  const d = desc(cls, 'getSchemas');
  Get('schemas')(cls.prototype, 'getSchemas', d);
  ApiOperation({ summary: `Get view schemas (table/form) for ${name}` })(cls.prototype, 'getSchemas', d);
  ApiResponse({ status: 200, description: `View schemas for ${name}` })(cls.prototype, 'getSchemas', d);
};

/**
 * Register `GET /resource.json` — returns the compact resource descriptor used by the frontend.
 * In dev mode the response is rebuilt from the live config registry on every request.
 */
export const registerResourceJsonEndpoint = (ctx: OperationContext): void => {
  const { cls, config, baseUrl } = ctx;
  const { route, name } = config;
  const resourceJsonPayload = buildResourceJsonPayload(config, baseUrl);

  def(cls, 'getResourceJson', async function (this: { configRegistry: ResourceConfigRegistry }) {
    if (IS_DEV) {
      const fresh = await this.configRegistry.getByRoute(route);
      if (fresh) return buildResourceJsonPayload(fresh, baseUrl);
    }
    return resourceJsonPayload;
  });
  const d = desc(cls, 'getResourceJson');
  Get('resource.json')(cls.prototype, 'getResourceJson', d);
  ApiOperation({ summary: `Get resource descriptor for ${name}` })(cls.prototype, 'getResourceJson', d);
  ApiResponse({ status: 200, description: `Resource descriptor (operations + JSON Schema) for ${name}` })(cls.prototype, 'getResourceJson', d);
};
