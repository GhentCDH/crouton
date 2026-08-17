import { Body, Controller, type Type } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type CrudRepository, createCrudRepository } from './crud-repository.factory';
import { isOperationEnabled, resolveDefinition, schemaFor, upsertOnFor } from './crud.config';
import { DataSourceRegistry } from './data-source';
import type { OperationContext } from './operations/operation-context';
import { registerEndpoints } from './operations/register-endpoints';
import { type Resource } from './resource/ResourceConfig.schema';
import { ResourceConfigRegistry } from './resource-config.registry';
import { isZodSchema } from './schema.utils';
import { ZodValidationPipe, type ZodValidationPipeOptions } from './zod-validation.pipe';

/**
 * Dynamically build a NestJS controller class for the given resource config.
 *
 * The factory registers standard CRUD routes, schema/definition endpoints,
 * procedure-action routes, and sub-resource routes — skipping any operation
 * not enabled in `config`. The returned class can be passed directly to
 * a NestJS module's `controllers` array.
 *
 * @param config - Resource definition including model, route, operations, views, etc.
 * @param baseUrl - Absolute base URL prepended to operation URIs in schema payloads (e.g. `https://api.example.com`).
 * @throws {Error} When `upsert` is enabled but no `upsertOn` key is configured.
 */
export function createCrudController(
  config: Resource,
  baseUrl?: string,
): Type<any> {
  const { route, name, tag, idType = 'string' } = config;
  const definition = resolveDefinition(config);
  const listSchema = schemaFor(definition, 'findAll');
  const oneSchema = schemaFor(definition, 'findOne') ?? listSchema;
  const createSchema = schemaFor(definition, 'create');
  const updateSchema = schemaFor(definition, 'update');
  const explicitPatchSchema = schemaFor(definition, 'patch');
  const patchSchema =
    explicitPatchSchema ??
    (updateSchema && isZodSchema(updateSchema)
      ? (updateSchema as any).partial()
      : undefined) ??
    updateSchema;
  const upsertSchema = schemaFor(definition, 'upsert') ?? createSchema;

  if (isOperationEnabled(definition, 'upsert') && !upsertOnFor(definition)) {
    throw new Error(`Resource "${name}" declares 'upsert' but no upsertOn`);
  }

  const bodyDecorator = (
    schema?: ReturnType<typeof schemaFor>,
    options?: ZodValidationPipeOptions,
  ): ParameterDecorator => {
    if (!schema) return Body();
    if (isZodSchema(schema))
      return Body(new ZodValidationPipe(schema, options));
    return Body();
  };

  const resolveClient = (
    registry: DataSourceRegistry,
    resource: Resource,
  ): any => {
    try {
      return registry.resolve(resource.database);
    } catch (e) {
      if (resource.kind === 'custom') return undefined;
      throw e;
    }
  };

  class CrudControllerBase {
    protected readonly repo: CrudRepository;
    protected readonly configRegistry: ResourceConfigRegistry;
    constructor(
      registry: DataSourceRegistry,
      configRegistry: ResourceConfigRegistry,
    ) {
      // A custom resource may legitimately run in a project with no
      // datasources at all, so a resolve failure is not fatal for it — the
      // repository simply receives `ctx.prisma === undefined`.
      const prisma = resolveClient(registry, config);
      this.repo = createCrudRepository(prisma, config, registry);
      this.configRegistry = configRegistry;
    }
  }

  const ctx: OperationContext = {
    cls: CrudControllerBase,
    config,
    definition,
    listSchema,
    oneSchema,
    createSchema,
    updateSchema,
    patchSchema,
    upsertSchema,
    idParamMeta: {
      name: 'id',
      type: idType === 'number' ? 'number' : 'string',
    },
    bodyDecorator,
    baseUrl,
  };

  registerEndpoints(ctx);

  // ── Class-level decorators ─────────────────────────────────────────────
  Controller(route)(CrudControllerBase);
  ApiTags(tag)(CrudControllerBase);
  Object.defineProperty(CrudControllerBase, 'name', {
    value: `${name.charAt(0).toUpperCase() + name.slice(1)}Controller`,
  });
  Reflect.defineMetadata(
    'design:paramtypes',
    [DataSourceRegistry, ResourceConfigRegistry],
    CrudControllerBase,
  );

  return CrudControllerBase;
}
