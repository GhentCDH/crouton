import { resolveDefinition, schemaFor } from './crud.config';
import { ReadRepository } from './read.repository';
import type { RequestDto } from './request.dto';
import { type Resource } from './resource/ResourceConfig.schema';
import { type SubResourceConfig } from './resource/SubResource.schema';
import { toSelectFields } from './schema.utils';
import { WriteRepository } from './write.repository';

/** Unified read/write interface for a CRUD resource, combining `ReadRepository` and `WriteRepository`. */
export interface CrudRepository<T = any> {
  /** Raw Prisma client — used by action procedures. */
  readonly prisma: any;
  findAll(params: RequestDto): Promise<T[]>;
  count(filter: string[]): Promise<number>;
  findOne(id: number | string): Promise<T>;
  findAllByParent(
    parentId: string | number,
    childRoute: string,
    params: RequestDto,
  ): Promise<{ data: T[]; count: number }>;
  findOneChild(
    sub: SubResourceConfig,
    childId: string | number,
    parentId?: string | number,
  ): Promise<T>;
  createChild(
    parentId: string | number,
    sub: SubResourceConfig,
    data: unknown,
  ): Promise<T>;
  updateChild(
    sub: SubResourceConfig,
    childId: string | number,
    data: unknown,
  ): Promise<T>;
  deleteChild(
    sub: SubResourceConfig,
    childId: string | number,
    parentId?: string | number,
  ): Promise<T>;
  create(data: unknown): Promise<T>;
  update(id: number | string, data: unknown): Promise<T>;
  upsert(data: unknown): Promise<T>;
  upsertMany(rows: unknown[]): Promise<T[]>;
  delete(id: number | string): Promise<T>;
}

/**
 * Construct a `CrudRepository` by wiring a `ReadRepository` and `WriteRepository` together.
 *
 * The `findAll`/`findOne` schemas are used to derive Prisma `select` clauses so only the
 * columns the view needs are fetched.
 *
 * @param prisma - Full PrismaClient instance.
 * @param config - Resource config. `config.model` must match a key on the PrismaClient.
 * @throws {Error} When `config.model` is not found on the provided PrismaClient.
 */
export function createCrudRepository<T = any>(
  prisma: any,
  config: Resource,
): CrudRepository<T> {
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
    upsert: writer.upsert.bind(writer),
    upsertMany: writer.upsertMany.bind(writer),
    delete: writer.delete.bind(writer),
    createChild: writer.createChild.bind(writer),
    updateChild: writer.updateChild.bind(writer),
    deleteChild: writer.deleteChild.bind(writer),
  };
}
