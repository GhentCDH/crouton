import type { ListRequest } from '@ghentcdh/crouton-core';

import { resolveDefinition, schemaFor } from './crud.config';
import {
  type DataSourceResolver,
  createCustomRepository,
} from './custom-repository';
import { ReadRepository } from './read.repository';
import type { ResourceConfigRegistry } from './resource-config.registry';
import { type Resource } from './resource/ResourceConfig.schema';
import { type SubResourceConfig } from './resource/SubResource.schema';
import { toSelectFields } from './schema.utils';
import { WriteRepository } from './write.repository';

/** Unified read/write interface for a CRUD resource, combining `ReadRepository` and `WriteRepository`. */
export interface CrudRepository<T = any> {
  /** Raw Prisma client — used by action procedures. */
  readonly prisma: any;
  findAll(params: ListRequest, request?: any): Promise<T[]>;
  count(filter: string[]): Promise<number>;
  /**
   * Fetch rows *and* their total count in a single call.
   *
   * Optional: the Prisma-backed repository leaves it undefined and callers fall
   * back to `findAll` + `count`. Repositories whose backend cannot count
   * separately (e.g. a remote HTTP API returning `{items, total}`) implement
   * this instead.
   */
  findAllWithCount?(
    params: ListRequest,
    request?: any,
  ): Promise<{ data: T[]; count: number }>;
  findOne(id: number | string, request?: any): Promise<T>;
  findAllByParent(
    parentId: string | number,
    childRoute: string,
    params: ListRequest,
    request?: any,
  ): Promise<{ data: T[]; count: number }>;
  findOneChild(
    sub: SubResourceConfig,
    childId: string | number,
    parentId?: string | number,
    request?: any,
  ): Promise<T>;
  createChild(
    parentId: string | number,
    sub: SubResourceConfig,
    data: unknown,
    request?: any,
  ): Promise<T>;
  updateChild(
    sub: SubResourceConfig,
    childId: string | number,
    data: unknown,
    request?: any,
  ): Promise<T>;
  deleteChild(
    sub: SubResourceConfig,
    childId: string | number,
    parentId?: string | number,
    request?: any,
  ): Promise<T>;
  create(data: unknown, request?: any): Promise<T>;
  update(id: number | string, data: unknown, request?: any): Promise<T>;
  patch(id: number | string, data: unknown, request?: any): Promise<T>;
  upsert(data: unknown, request?: any): Promise<T>;
  upsertMany(rows: unknown[], request?: any): Promise<T[]>;
  delete(id: number | string, request?: any): Promise<T>;
}

/**
 * Construct a `CrudRepository` by wiring a `ReadRepository` and `WriteRepository` together.
 *
 * The `findAll`/`findOne` schemas are used to derive Prisma `select` clauses so only the
 * columns the view needs are fetched.
 *
 * A `kind: "custom"` resource short-circuits to `createCustomRepository`, which
 * delegates to the user's `repository.ts`.
 *
 * @param prisma - Full PrismaClient instance (may be `undefined` for a custom
 *   resource in a project with no datasources).
 * @param config - Resource config. `config.model` must match a key on the PrismaClient.
 * @param dataSources - Registry exposed to a custom repository as `ctx.dataSources`.
 * @throws {Error} When `config.model` is not found on the provided PrismaClient.
 */
export function createCrudRepository<T = any>(
  prisma: any,
  config: Resource,
  dataSources?: DataSourceResolver,
  configRegistry?: ResourceConfigRegistry,
): CrudRepository<T> {
  // A custom resource brings its own data access; everything below this point
  // assumes a Prisma delegate.
  if (config.kind === 'custom') {
    return createCustomRepository<T>(
      prisma,
      config,
      dataSources ?? {
        resolve: () => prisma,
        entries: () => [],
      },
      config.repository,
      configRegistry,
    );
  }

  if (!config.model) {
    throw new Error(
      `Resource "${config.name}" has no "model". A prisma-backed resource must ` +
        'name its Prisma model; set "kind": "custom" for a resource with no model.',
    );
  }
  const model = prisma[config.model];
  if (!model) {
    throw new Error(
      `Model "${config.model}" not found on the provided PrismaClient. ` +
        `Check the resource config for "${config.name}".`,
    );
  }

  const definition = resolveDefinition(config);
  const listSchema = schemaFor(definition, 'findAll');
  const oneSchema = schemaFor(definition, 'findOne');
  const listSelect = listSchema ? toSelectFields(listSchema) : undefined;
  const oneSelect = oneSchema ? toSelectFields(oneSchema) : listSelect;

  const reader = new ReadRepository<T>(
    model,
    prisma,
    config,
    listSelect,
    oneSelect,
    configRegistry,
  );
  const writer = new WriteRepository<T>(model, prisma, config);

  return {
    prisma,
    findAll: reader.findAll.bind(reader),
    count: reader.count.bind(reader),
    findOne: reader.findOne.bind(reader),
    findAllByParent: reader.findAllByParent.bind(reader),
    findOneChild: reader.findOneChild.bind(reader),
    create: writer.create.bind(writer),
    update: writer.update.bind(writer),
    patch: writer.patch.bind(writer),
    upsert: writer.upsert.bind(writer),
    upsertMany: writer.upsertMany.bind(writer),
    delete: writer.delete.bind(writer),
    createChild: writer.createChild.bind(writer),
    updateChild: writer.updateChild.bind(writer),
    deleteChild: writer.deleteChild.bind(writer),
  };
}
