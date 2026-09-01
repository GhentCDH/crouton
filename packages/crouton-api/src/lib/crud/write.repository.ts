import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { JsonIncludeEntry } from '@ghentcdh/crouton-core';

import { DEFAULT_ID_FIELD, PRISMA_NOT_FOUND_CODE } from './constants';
import { resolveDefinition, upsertOnFor } from './crud.config';
import {
  childCtx,
  childRepositoryFn,
  parentIdFromRequest,
} from './custom-repository/child-delegate';
import type { DataSourceAdapter } from './data-source/data-source.adapter';
import { type WriteOp } from './hooks';
import { type Resource } from './resource/ResourceConfig.schema';
import type { SubResourceConfig } from './resource/SubResource.schema';
import { normalizeValueLabels } from './resource/valueLabel.apply';

/** Extract the top-level relation names from a `JsonIncludeEntry[]` (for payload stripping). */
const includeRelationNames = (
  include: JsonIncludeEntry[] | undefined,
): Set<string> =>
  new Set((include ?? []).map((e) => (typeof e === 'string' ? e : e.relation)));

/** Prisma nested-write keywords that indicate a relation mutation rather than read-only join data. */
const PRISMA_RELATION_WRITE_KEYS = new Set([
  'connect',
  'connectOrCreate',
  'create',
  'createMany',
  'set',
  'disconnect',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

/** Returns `true` when `value` looks like a Prisma relation write (e.g. `{ connect: { id } }`). */
const isPrismaRelationWrite = (value: unknown): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.keys(value).some((k) => PRISMA_RELATION_WRITE_KEYS.has(k));
};

/** Remove sub-resource count columns from a write payload. Module-level so the factory can use it. */
export const stripSubResourceKeys = (config: Resource, data: unknown): unknown => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const subKeys = new Set((config.subResources ?? []).map((s) => s.column));
  if (!subKeys.size) return data;
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).filter(([k]) => !subKeys.has(k)),
  );
};

const stripNonCreateableChildFields = (
  sub: SubResourceConfig,
  data: unknown,
): unknown => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const nonCreateable = new Set<string>(
    (sub.views?.form?.columns ?? [])
      .filter((c) => (c as any).createable === false)
      .map((c) => c.id),
  );
  if (!nonCreateable.size) return data;
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).filter(
      ([k]) => !nonCreateable.has(k),
    ),
  );
};

/**
 * Handles all write operations for a resource — create, update, upsert, delete, and child mutations.
 *
 * Resource-level `beforeWrite`/`afterWrite` hooks are NOT applied here for the core operations
 * (create, update, patch, delete) — they are applied by the factory wrapper so Prisma and custom
 * adapters share the same hook path. Sub-resource hooks are still applied inline.
 *
 * `upsert`/`upsertMany` retain their own hook calls because the op (create vs update) must be
 * determined by a database lookup before hooks can run.
 *
 * Prisma `P2025` (record not found) errors are mapped to `NotFoundException`.
 */
export class WriteRepository<T = any> {
  private get prisma(): any {
    return this.adapter.client;
  }

  constructor(
    private readonly prismaModel: any,
    private readonly adapter: DataSourceAdapter,
    private readonly config: Resource,
  ) {}

  private toId(id: string | number): string | number {
    return (this.config.idType ?? 'string') === 'number' ? +id : String(id);
  }

  private notFound(id: string | number): NotFoundException {
    return new NotFoundException(`${this.config.name} with id ${id} not found`);
  }

  private upsertWhere(data: any): Record<string, unknown> {
    const keys = upsertOnFor(resolveDefinition(this.config));
    if (!keys)
      throw new BadRequestException(
        `${this.config.name} has no upsertOn configured`,
      );
    if (typeof keys === 'string') return { [keys]: data[keys] };
    const composite = keys.join('_');
    return { [composite]: Object.fromEntries(keys.map((k) => [k, data[k]])) };
  }

  /**
   * The parent a *child* write is scoped to, for the hook context.
   *
   * A sub-resource is served by the parent's controller, so its parent id arrives
   * as the parent's own `:id` — hence `param: 'id'`. A resource that declares
   * `parent` names its own param and goes through the custom adapter instead.
   */
  private parentHookContext(parentId: string | number) {
    return {
      route: this.config.route,
      param: 'id',
      id: this.toId(parentId),
    };
  }

  /**
   * Create a record. The data has already been stripped of sub-resource keys,
   * normalized, and run through `beforeWrite` by the factory wrapper.
   */
  async create(data: unknown, _request?: any): Promise<T> {
    return this.prismaModel.create({ data });
  }

  /**
   * Update a record. The data has already been stripped, normalized, and hooked
   * by the factory wrapper.
   */
  async update(id: number | string, data: unknown, _request?: any): Promise<T> {
    const idField = this.config.idField ?? 'id';
    try {
      return await this.prismaModel.update({
        where: { [idField]: this.toId(id) },
        data,
      });
    } catch (e: any) {
      if (e?.code === PRISMA_NOT_FOUND_CODE) throw this.notFound(id);
      throw e;
    }
  }

  /**
   * Partial-update a record. Same contract as `update`.
   */
  async patch(id: number | string, data: unknown, _request?: any): Promise<T> {
    const idField = this.config.idField ?? 'id';
    try {
      return await this.prismaModel.update({
        where: { [idField]: this.toId(id) },
        data,
      });
    } catch (e: any) {
      if (e?.code === PRISMA_NOT_FOUND_CODE) throw this.notFound(id);
      throw e;
    }
  }

  /**
   * Upsert — retains its own hook calls because the op (create vs update) must be
   * determined by a database lookup before hooks can be applied.
   */
  async upsert(data: unknown, request?: any): Promise<T> {
    const { prepareWrite, postWrite } = await import('./hooks');
    const where = this.upsertWhere(data);
    const existing = await this.prismaModel.findFirst({ where });
    const op: WriteOp = existing ? 'update' : 'create';
    const existingId = existing
      ? existing[this.config.idField ?? DEFAULT_ID_FIELD]
      : undefined;
    const prepared = await prepareWrite(
      stripSubResourceKeys(this.config, data),
      op,
      this.config,
      this.adapter,
      existingId,
      request,
    );
    const result = await this.prismaModel.upsert({
      where,
      create: prepared,
      update: prepared,
    });
    return postWrite(result, op, this.config, this.adapter, existingId, request);
  }

  /** Upsert multiple rows in parallel. */
  upsertMany(rows: unknown[], request?: any): Promise<T[]> {
    return Promise.all(rows.map((r) => this.upsert(r, request)));
  }

  async delete(id: number | string, _request?: any): Promise<T> {
    const idField = this.config.idField ?? 'id';
    try {
      return await this.prismaModel.delete({
        where: { [idField]: this.toId(id) },
      });
    } catch (e: any) {
      if (e?.code === PRISMA_NOT_FOUND_CODE) throw this.notFound(id);
      throw e;
    }
  }

  /**
   * Write to a **custom** sub-resource by delegating to the child's own
   * repository.
   *
   * The child has no Prisma model, so `prisma[childModel]` is not an option.
   * Value-label normalisation and the child's `beforeWrite`/`afterWrite` hooks
   * still apply, so a custom child behaves like a Prisma one from the caller's
   * point of view.
   */
  private async delegateChildWrite(
    sub: SubResourceConfig,
    op: 'create' | 'update' | 'patch' | 'delete',
    parentId: string | number | undefined,
    childId: string | number | undefined,
    data: unknown,
    request?: any,
  ): Promise<any> {
    if (parentId === undefined) {
      throw new BadRequestException(
        `Sub-resource "${sub.childRoute}" of "${this.config.name}" requires a parent id.`,
      );
    }

    const fn = childRepositoryFn(sub, op, this.config.name);
    const id =
      childId === undefined
        ? undefined
        : (sub.idType ?? 'string') === 'number'
          ? +childId
          : String(childId);

    const ctx = childCtx({
      parentConfig: this.config,
      prisma: this.prisma,
      op,
      parentId: this.toId(parentId),
      id,
      request,
    });

    let payload: unknown;
    if (op !== 'delete') {
      const stripped =
        op === 'create' ? stripNonCreateableChildFields(sub, data) : data;
      const normalized = normalizeValueLabels(stripped, sub.valueLabelColumns);
      payload = sub.hooks?.beforeWrite
        ? await sub.hooks.beforeWrite(normalized, {
            dataSource: this.adapter,
            prisma: this.prisma,
            op: op === 'patch' ? 'patch' : op,
            ...(id !== undefined && { id }),
            request,
            parent: ctx.parent,
          })
        : normalized;
    }

    const result =
      op === 'create'
        ? await fn(this.toId(parentId), payload, ctx)
        : op === 'delete'
          ? await fn(this.toId(parentId), id, ctx)
          : await fn(this.toId(parentId), id, payload, ctx);

    return sub.hooks?.afterWrite
      ? sub.hooks.afterWrite(result, {
          dataSource: this.adapter,
          prisma: this.prisma,
          op: op === 'patch' ? 'patch' : op,
          ...(id !== undefined && { id }),
          request,
        })
      : result;
  }

  /**
   * Create a child record and attach it to the parent via the configured foreign key.
   * Fields marked `createable: false` in the form view are stripped before writing.
   */
  async createChild(
    parentId: string | number,
    sub: SubResourceConfig,
    data: unknown,
    request?: any,
  ): Promise<any> {
    if (sub.childKind === 'custom') {
      return this.delegateChildWrite(sub, 'create', parentId, undefined, data, request);
    }

    const childModel = this.prisma[sub.childModel];
    if (!childModel)
      throw new Error(`Prisma model "${sub.childModel}" not found`);

    const stripped = stripNonCreateableChildFields(sub, data);
    const normalized = normalizeValueLabels(
      stripped,
      sub.valueLabelColumns,
    ) as object;
    const payload = { ...normalized, [sub.foreignKey]: this.toId(parentId) };
    const prepared = sub.hooks?.beforeWrite
      ? await sub.hooks.beforeWrite(payload, {
          dataSource: this.adapter,
          prisma: this.prisma,
          op: 'create',
          request,
          parent: this.parentHookContext(parentId),
        })
      : payload;

    const includeKeys = includeRelationNames(sub.include);
    const preparedEntries = prepared as Record<string, unknown>;
    const prismaData = {
      ...Object.fromEntries(
        Object.entries(preparedEntries).filter(
          ([k, v]) => !includeKeys.has(k) || isPrismaRelationWrite(v),
        ),
      ),
      ...(sub.foreignKey in preparedEntries
        ? { [sub.foreignKey]: this.toId(parentId) }
        : {}),
    };
    const result = await childModel.create({ data: prismaData });
    return sub.hooks?.afterWrite
      ? sub.hooks.afterWrite(result, {
          dataSource: this.adapter,
          prisma: this.prisma,
          op: 'create',
          request,
        })
      : result;
  }

  /**
   * Update a child record. Relation include-keys are stripped from the payload so Prisma doesn't
   * receive non-scalar fields.
   * @throws {NotFoundException} When the child record does not exist (Prisma P2025).
   */
  async updateChild(
    sub: SubResourceConfig,
    childId: string | number,
    data: unknown,
    request?: any,
  ): Promise<any> {
    if (sub.childKind === 'custom') {
      return this.delegateChildWrite(
        sub,
        'update',
        parentIdFromRequest(request),
        childId,
        data,
        request,
      );
    }

    const childModel = this.prisma[sub.childModel];
    if (!childModel)
      throw new Error(`Prisma model "${sub.childModel}" not found`);

    const id =
      (sub.idType ?? 'string') === 'number' ? +childId : String(childId);
    const normalized = normalizeValueLabels(data, sub.valueLabelColumns);
    const afterHook = sub.hooks?.beforeWrite
      ? await sub.hooks.beforeWrite(normalized, {
          dataSource: this.adapter,
          prisma: this.prisma,
          op: 'update',
          id,
          request,
          parent: this.parentHookContext(parentIdFromRequest(request) ?? id),
        })
      : normalized;

    const includeKeys = includeRelationNames(sub.include);
    const prepared = Object.fromEntries(
      Object.entries(afterHook as Record<string, unknown>).filter(
        ([k, v]) => !includeKeys.has(k) || isPrismaRelationWrite(v),
      ),
    );
    try {
      const result = await childModel.update({
        where: { [sub.idField ?? DEFAULT_ID_FIELD]: id },
        data: prepared,
      });
      return sub.hooks?.afterWrite
        ? sub.hooks.afterWrite(result, {
            dataSource: this.adapter,
            prisma: this.prisma,
            op: 'update',
            id,
            request,
          })
        : result;
    } catch (e: any) {
      if (e?.code === PRISMA_NOT_FOUND_CODE)
        throw new NotFoundException(
          `${sub.childRoute} with id ${childId} not found`,
        );
      throw e;
    }
  }

  /**
   * Delete a child record. When `parentId` is supplied the foreign key is included in the `where`
   * clause to prevent cross-parent deletions.
   * @throws {NotFoundException} When no matching record is found.
   */
  async deleteChild(
    sub: SubResourceConfig,
    childId: string | number,
    parentId?: string | number,
    request?: any,
  ): Promise<any> {
    if (sub.childKind === 'custom') {
      return this.delegateChildWrite(
        sub,
        'delete',
        parentIdFromRequest(request, parentId),
        childId,
        undefined,
        request,
      );
    }

    const childModel = this.prisma[sub.childModel];
    if (!childModel)
      throw new Error(`Prisma model "${sub.childModel}" not found`);

    const id =
      (sub.idType ?? 'string') === 'number' ? +childId : String(childId);
    const idField = sub.idField ?? 'id';
    const where: Record<string, unknown> = { [idField]: id };
    if (parentId !== undefined) where[sub.foreignKey] = this.toId(parentId);

    try {
      const result = await childModel.deleteMany({ where });
      if (result.count === 0)
        throw new NotFoundException(
          `${sub.childRoute} with id ${childId} not found`,
        );
      return sub.hooks?.afterWrite
        ? sub.hooks.afterWrite(result, {
            dataSource: this.adapter,
            prisma: this.prisma,
            op: 'delete',
            id,
            request,
          })
        : result;
    } catch (e: any) {
      if (e?.code === PRISMA_NOT_FOUND_CODE)
        throw new NotFoundException(
          `${sub.childRoute} with id ${childId} not found`,
        );
      throw e;
    }
  }
}
