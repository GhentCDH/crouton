
import {
  BadRequestException,
  Body,
  ForbiddenException,
  Get,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { IS_DEV } from '../dev-mode';
import {
  type PatchResourceJson,
  PatchResourceJsonSchema,
} from '../resource/PatchResourceJson.schema';
import {
  applyColumnPatch,
  readRawResourceJson,
  validateResourceJson,
  writeRawResourceJson,
} from '../resource/WriteResourceJson';
import { type ResourceConfigRegistry } from '../resource-config.registry';
import { ZodValidationPipe } from '../zod-validation.pipe';
import { def, desc } from './decorator.utils';
import type { OperationContext } from './operation-context';
import {
  buildDefinitionPayload,
  buildEditableColumnsPayload,
  buildResourceJsonPayload,
  buildViewsPayload,
} from './payload-builders';
import { join } from 'node:path';

/**
 * Register `GET /definition` — returns the resource's enabled operations and JSON Schemas.
 * In dev mode the response is rebuilt from the live config registry on every request.
 */
export const registerDefinitionEndpoint = (ctx: OperationContext): void => {
  const { cls, config } = ctx;
  const { route, name } = config;
  const definitionPayload = buildDefinitionPayload(config);

  def(
    cls,
    'getDefinition',
    async function (this: { configRegistry: ResourceConfigRegistry }) {
      if (IS_DEV) {
        const fresh = await this.configRegistry.getByRoute(route);
        if (fresh) return buildDefinitionPayload(fresh);
      }
      return definitionPayload;
    },
  );
  const d = desc(cls, 'getDefinition');
  Get('definition')(cls.prototype, 'getDefinition', d);
  ApiOperation({ summary: `Get the resource definition for ${name}` })(
    cls.prototype,
    'getDefinition',
    d,
  );
  ApiResponse({
    status: 200,
    description: `Definition (operations + schemas) for ${name}`,
  })(cls.prototype, 'getDefinition', d);
};

/**
 * Register `GET /schemas` — returns view schemas (table/form) for the resource.
 * In dev mode the response is rebuilt from the live config registry on every request.
 */
export const registerSchemasEndpoint = (ctx: OperationContext): void => {
  const { cls, config, baseUrl } = ctx;
  const { route, name } = config;
  const viewsPayload = buildViewsPayload(config, baseUrl);

  def(
    cls,
    'getSchemas',
    async function (this: { configRegistry: ResourceConfigRegistry }) {
      if (IS_DEV) {
        const fresh = await this.configRegistry.getByRoute(route);
        if (fresh) return buildViewsPayload(fresh, baseUrl) ?? viewsPayload;
      }
      return viewsPayload;
    },
  );
  const d = desc(cls, 'getSchemas');
  Get('schemas')(cls.prototype, 'getSchemas', d);
  ApiOperation({ summary: `Get view schemas (table/form) for ${name}` })(
    cls.prototype,
    'getSchemas',
    d,
  );
  ApiResponse({ status: 200, description: `View schemas for ${name}` })(
    cls.prototype,
    'getSchemas',
    d,
  );
};

/**
 * Register `GET /resource.json` — returns the compact resource descriptor used by the frontend.
 * In dev mode the response is rebuilt from the live config registry on every request.
 */
export const registerResourceJsonEndpoint = (ctx: OperationContext): void => {
  const { cls, config, baseUrl } = ctx;
  const { route, name } = config;
  const resourceJsonPayload = buildResourceJsonPayload(config, baseUrl);

  def(
    cls,
    'getResourceJson',
    async function (this: { configRegistry: ResourceConfigRegistry }) {
      if (IS_DEV) {
        const fresh = await this.configRegistry.getByRoute(route);
        if (fresh) return buildResourceJsonPayload(fresh, baseUrl);
      }
      return resourceJsonPayload;
    },
  );
  const d = desc(cls, 'getResourceJson');
  Get('resource.json')(cls.prototype, 'getResourceJson', d);
  ApiOperation({ summary: `Get resource descriptor for ${name}` })(
    cls.prototype,
    'getResourceJson',
    d,
  );
  ApiResponse({
    status: 200,
    description: `Resource descriptor (operations + JSON Schema) for ${name}`,
  })(cls.prototype, 'getResourceJson', d);
};

/**
 * Register `GET /resource-columns` — dev-only endpoint backing the visual
 * resource builder's editor UI. Returns the raw, editable column list (see
 * `buildEditableColumnsPayload`), rebuilt from the live config registry on
 * every request so it reflects any on-disk edits (including ones made by
 * this same builder, or by hand, or by `crouton update resources`).
 */
export const registerResourceColumnsEndpoint = (
  ctx: OperationContext,
): void => {
  const { cls, config } = ctx;
  const { route, name } = config;

  def(
    cls,
    'getResourceColumns',
    async function (this: { configRegistry: ResourceConfigRegistry }) {
      if (!IS_DEV) {
        throw new ForbiddenException(
          'The resource schema editor is only available when the backend is running in local dev mode.',
        );
      }
      const fresh = await this.configRegistry.getByRoute(route);
      return buildEditableColumnsPayload(fresh ?? config);
    },
  );
  const d = desc(cls, 'getResourceColumns');
  Get('resource-columns')(cls.prototype, 'getResourceColumns', d);
  ApiOperation({
    summary: `Dev-only: get the editable column list for ${name}`,
  })(cls.prototype, 'getResourceColumns', d);
  ApiResponse({
    status: 200,
    description: `Editable column list for ${name}`,
  })(cls.prototype, 'getResourceColumns', d);
};

/**
 * Register `PATCH /resource.json` — dev-only endpoint backing the visual
 * resource builder. Patches column display attributes (label, column,
 * hiddenInTable, hiddenInForm, hiddenInView, position, colspan) on the
 * resource's on-disk `resource.json` and returns the freshly reloaded
 * resource descriptor.
 *
 * Hard-gated to `IS_DEV`: refuses with 403 in any non-dev environment, since
 * writing to source files must never happen against a production deployment.
 */
export const registerResourceJsonPatchEndpoint = (
  ctx: OperationContext,
): void => {
  const { cls, config } = ctx;
  const { route, name } = config;

  def(
    cls,
    'patchResourceJson',
    async function (
      this: { configRegistry: ResourceConfigRegistry },
      body: PatchResourceJson,
    ) {
      if (!IS_DEV) {
        throw new ForbiddenException(
          'Editing resource.json is only available when the backend is running in local dev mode.',
        );
      }

      // Refresh the registry first so `getResourceDir` reflects the current on-disk layout.
      await this.configRegistry.getByRoute(route);
      const dir = this.configRegistry.getResourceDir(route);
      if (!dir) {
        throw new NotFoundException(
          `No resource.json on disk for "${name}" (route "${route}").`,
        );
      }

      const jsonPath = join(dir, 'resource.json');
      const raw = readRawResourceJson(jsonPath);
      if (!raw) {
        throw new NotFoundException(`resource.json not found at ${jsonPath}`);
      }

      const merged = applyColumnPatch(raw, body);
      const validated = validateResourceJson(merged);
      if (!validated.success) {
        throw new BadRequestException(validated.error.issues);
      }

      writeRawResourceJson(jsonPath, merged);

      const fresh = await this.configRegistry.getByRoute(route);
      return buildEditableColumnsPayload(fresh ?? config);
    },
  );
  const d = desc(cls, 'patchResourceJson');
  Patch('resource.json')(cls.prototype, 'patchResourceJson', d);
  Body(new ZodValidationPipe(PatchResourceJsonSchema))(
    cls.prototype,
    'patchResourceJson',
    0,
  );
  ApiOperation({
    summary: `Dev-only: patch column layout in resource.json for ${name}`,
  })(cls.prototype, 'patchResourceJson', d);
  ApiResponse({
    status: 200,
    description: `Updated resource descriptor for ${name}`,
  })(cls.prototype, 'patchResourceJson', d);
};
