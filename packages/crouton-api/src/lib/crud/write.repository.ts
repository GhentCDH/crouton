import { BadRequestException, NotFoundException } from '@nestjs/common';

import { fromValueLabel } from '@ghentcdh/crouton-core';

import { DEFAULT_ID_FIELD, PRISMA_NOT_FOUND_CODE } from './constants';
import type { SubResourceConfig, ValueLabelColumn, WriteOp } from './crud.config';
import { resolveDefinition, upsertOnFor } from './crud.config';
import type { JsonIncludeEntry } from './loader/json-config.types';
import { Resource } from './resource/ResourceConfig.schema';

/** Unwrap `{ value, label }` fields back to their scalar before persistence. */
const normalizeValueLabels = (
  data: unknown,
  cols: ValueLabelColumn[] | undefined,
): unknown => {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !cols?.length)
    return data;
  const out = { ...(data as Record<string, unknown>) };
  for (const { field } of cols) {
    if (field in out) out[field] = fromValueLabel(out[field]);
  }
  return out;
};

/** Extract the top-level relation names from a `JsonIncludeEntry[]` (for payload stripping). */
const includeRelationNames = (
  include: JsonIncludeEntry[] | undefined,
): Set<string> =>
  new Set((include ?? []).map((e) => (typeof e === 'string' ? e : e.relation)));

/**
 * Handles all write operations for a resource — create, update, upsert, delete, and child mutations.
 *
 * Sub-resource count columns are stripped from payloads before writing.
 * `beforeWrite` hooks are invoked (when configured) prior to every Prisma call.
 * Prisma `P2025` (record not found) errors are mapped to `NotFoundException`.
 */
export class WriteRepository<T = any> {
  constructor(
    private readonly prismaModel: any,
    private readonly prisma: any,
    private readonly config: Resource,
  ) {}

  private toId(id: string | number): string | number {
    return (this.config.idType ?? 'string') === 'number' ? +id : String(id);
  }

  private notFound(id: string | number): NotFoundException {
    return new NotFoundException(`${this.config.name} with id ${id} not found`);
  }

  private stripSubResourceKeys(data: unknown): unknown {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    const subKeys = new Set(
      (this.config.subResources ?? []).map((s) => s.column),
    );
    if (!subKeys.size) return data;
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).filter(
        ([k]) => !subKeys.has(k),
      ),
    );
  }

  private stripNonCreateableChildFields(
    data: unknown,
    sub: SubResourceConfig,
  ): unknown {
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
  }

  private async prepare(
    data: any,
    op: WriteOp,
    id?: string | number,
  ): Promise<any> {
    const normalized = normalizeValueLabels(
      data,
      this.config.valueLabelColumns,
    );
    const hook = this.config.hooks?.beforeWrite;
    return hook
      ? hook(normalized, { prisma: this.prisma, op, id })
      : normalized;
  }

  private async postWrite(
    result: any,
    op: WriteOp,
    id?: string | number,
  ): Promise<any> {
    const hook = this.config.hooks?.afterWrite;
    return hook ? hook(result, { prisma: this.prisma, op, id }) : result;
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

  async create(data: unknown): Promise<T> {
    const result = await this.prismaModel.create({
      data: await this.prepare(this.stripSubResourceKeys(data), 'create'),
    });
    return this.postWrite(result, 'create');
  }

  async update(id: number | string, data: unknown): Promise<T> {
    const idField = this.config.idField ?? 'id';
    try {
      const result = await this.prismaModel.update({
        where: { [idField]: this.toId(id) },
        data: await this.prepare(
          this.stripSubResourceKeys(data),
          'update',
          this.toId(id),
        ),
      });
      return this.postWrite(result, 'update', this.toId(id));
    } catch (e: any) {
      if (e?.code === PRISMA_NOT_FOUND_CODE) throw this.notFound(id);
      throw e;
    }
  }

  async upsert(data: unknown): Promise<T> {
    const where = this.upsertWhere(data);
    const existing = await this.prismaModel.findFirst({ where });
    const op: WriteOp = existing ? 'update' : 'create';
    const prepared = await this.prepare(
      this.stripSubResourceKeys(data),
      op,
      existing ? existing[this.config.idField ?? DEFAULT_ID_FIELD] : undefined,
    );
    const result = await this.prismaModel.upsert({
      where,
      create: prepared,
      update: prepared,
    });
    return this.postWrite(
      result,
      op,
      existing ? existing[this.config.idField ?? DEFAULT_ID_FIELD] : undefined,
    );
  }

  /** Upsert multiple rows in parallel. */
  upsertMany(rows: unknown[]): Promise<T[]> {
    return Promise.all(rows.map((r) => this.upsert(r)));
  }

  async delete(id: number | string): Promise<T> {
    const idField = this.config.idField ?? 'id';
    try {
      const result = await this.prismaModel.delete({
        where: { [idField]: this.toId(id) },
      });
      return this.postWrite(result, 'delete', this.toId(id));
    } catch (e: any) {
      if (e?.code === PRISMA_NOT_FOUND_CODE) throw this.notFound(id);
      throw e;
    }
  }

  /**
   * Create a child record and attach it to the parent via the configured foreign key.
   * Fields marked `createable: false` in the form view are stripped before writing.
   */
  async createChild(
    parentId: string | number,
    sub: SubResourceConfig,
    data: unknown,
  ): Promise<any> {
    const childModel = this.prisma[sub.childModel];
    if (!childModel)
      throw new Error(`Prisma model "${sub.childModel}" not found`);

    const stripped = this.stripNonCreateableChildFields(data, sub);
    const normalized = normalizeValueLabels(
      stripped,
      sub.valueLabelColumns,
    ) as object;
    const payload = { ...normalized, [sub.foreignKey]: this.toId(parentId) };
    const prepared = sub.hooks?.beforeWrite
      ? await sub.hooks.beforeWrite(payload, {
          prisma: this.prisma,
          op: 'create',
        })
      : payload;

    const includeKeys = includeRelationNames(sub.include);
    const prismaData = {
      ...Object.fromEntries(
        Object.entries(prepared as Record<string, unknown>).filter(
          ([k]) => !includeKeys.has(k),
        ),
      ),
      [sub.foreignKey]: this.toId(parentId),
    };
    const result = await childModel.create({ data: prismaData });
    return sub.hooks?.afterWrite
      ? sub.hooks.afterWrite(result, { prisma: this.prisma, op: 'create' })
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
  ): Promise<any> {
    const childModel = this.prisma[sub.childModel];
    if (!childModel)
      throw new Error(`Prisma model "${sub.childModel}" not found`);

    const id =
      (sub.idType ?? 'string') === 'number' ? +childId : String(childId);
    const normalized = normalizeValueLabels(data, sub.valueLabelColumns);
    const afterHook = sub.hooks?.beforeWrite
      ? await sub.hooks.beforeWrite(normalized, {
          prisma: this.prisma,
          op: 'update',
          id,
        })
      : normalized;

    const includeKeys = includeRelationNames(sub.include);
    const prepared = Object.fromEntries(
      Object.entries(afterHook as Record<string, unknown>).filter(
        ([k]) => !includeKeys.has(k),
      ),
    );
    try {
      const result = await childModel.update({
        where: { [sub.idField ?? DEFAULT_ID_FIELD]: id },
        data: prepared,
      });
      return sub.hooks?.afterWrite
        ? sub.hooks.afterWrite(result, {
            prisma: this.prisma,
            op: 'update',
            id,
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
  ): Promise<any> {
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
            prisma: this.prisma,
            op: 'delete',
            id,
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
