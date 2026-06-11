import { Controller, type Type } from '@nestjs/common';
import { Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type CrudRepository, createCrudRepository } from './crud-repository.factory';
import {
  type ResourceConfig,
  isOperationEnabled,
  resolveDefinition,
  schemaFor,
  upsertOnFor,
} from './crud.config';
import { DataSourceRegistry } from './data-source';
import type { OperationContext } from './operations/operation-context';
import { registerActionRoutes } from './operations/register-actions';
import { registerCreate, registerDelete, registerFindAll, registerFindOne, registerUpdate, registerUpsert } from './operations/register-crud';
import { registerDefinitionEndpoint, registerResourceJsonEndpoint, registerSchemasEndpoint } from './operations/register-schema-endpoints';
import { registerSubResourceRoutes } from './operations/register-sub-resources';
import { ResourceConfigRegistry } from './resource-config.registry';
import { isZodSchema } from './schema.utils';
import { ZodValidationPipe } from './zod-validation.pipe';

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
  config: ResourceConfig,
  baseUrl?: string,
): Type<any> {
  const { route, name, tag, idType = 'string' } = config;
  const definition = resolveDefinition(config);
  const listSchema = schemaFor(definition, 'findAll');
  const oneSchema = schemaFor(definition, 'findOne') ?? listSchema;
  const createSchema = schemaFor(definition, 'create');
  const updateSchema = schemaFor(definition, 'update');
  const upsertSchema = schemaFor(definition, 'upsert') ?? createSchema;

  if (isOperationEnabled(definition, 'upsert') && !upsertOnFor(definition)) {
    throw new Error(`Resource "${name}" declares 'upsert' but no upsertOn`);
  }

  const bodyDecorator = (schema?: ReturnType<typeof schemaFor>): ParameterDecorator => {
    if (!schema) return Body();
    if (isZodSchema(schema)) return Body(new ZodValidationPipe(schema));
    return Body();
  };

  class CrudControllerBase {
    protected readonly repo: CrudRepository;
    protected readonly configRegistry: ResourceConfigRegistry;
    constructor(registry: DataSourceRegistry, configRegistry: ResourceConfigRegistry) {
      const prisma = registry.resolve(config.database);
      this.repo = createCrudRepository(prisma, config);
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
    upsertSchema,
    idParamMeta: { name: 'id', type: idType === 'number' ? 'number' : 'string' },
    bodyDecorator,
    baseUrl,
  };

  // ── Register operations (order matters: static routes before :id routes) ──
  registerFindAll(ctx);
  registerDefinitionEndpoint(ctx);
  registerSchemasEndpoint(ctx);
  registerResourceJsonEndpoint(ctx);
  registerActionRoutes(ctx);
  registerSubResourceRoutes(ctx);
  registerFindOne(ctx);
  registerCreate(ctx);
  registerUpdate(ctx);
  registerUpsert(ctx);
  registerDelete(ctx);

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
