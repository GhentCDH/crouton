import { NotFoundException } from '@nestjs/common';

import type { ListRequest } from '@ghentcdh/crouton-core';

import type { AdapterCrudContext, DataSourceAdapter } from './data-source.adapter';
import { ReadRepository } from '../read.repository';
import { WriteRepository } from '../write.repository';

const DB_CHECK_TIMEOUT_MS = 3_000;

/**
 * Default adapter: wraps a generated PrismaClient.
 *
 * Phase 1: lifecycle wrapper.
 * Phase 2: full CRUD surface — each method delegates to ReadRepository /
 * WriteRepository so subclasses can override individual operations without
 * re-implementing the rest.
 *
 * Extend this class to build a composable adapter:
 *
 * ```ts
 * export default class AnnotationAdapter extends PrismaDataSourceAdapter {
 *   constructor() { super(prisma); }
 *
 *   override async findAll(model, params, ctx) {
 *     const result = await super.findAll(model, params, ctx);
 *     return { ...result, data: decorateWithAnnotations(result.data) };
 *   }
 * }
 * ```
 */
export class PrismaDataSourceAdapter implements DataSourceAdapter {
  readonly kind = 'prisma' as const;
  readonly client: unknown;

  constructor(prismaClient: unknown) {
    this.client = prismaClient;
  }

  supports(model: string): boolean {
    return typeof (this.client as any)?.[model] !== 'undefined';
  }

  async healthCheck(): Promise<void> {
    const c = this.client as any;
    await Promise.race([
      c.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database health check timed out')), DB_CHECK_TIMEOUT_MS),
      ),
    ]);
  }

  async disconnect(): Promise<void> {
    const c = this.client as any;
    if (typeof c?.$disconnect === 'function') {
      await c.$disconnect();
    }
  }

  // ── CRUD surface (Phase 2) ────────────────────────────────────────────────
  // Each method resolves the Prisma delegate, constructs the appropriate
  // repository, and delegates. Subclasses may override any of these.

  private prismaModel(model: string): any {
    const delegate = (this.client as any)?.[model];
    if (!delegate)
      throw new Error(`Model "${model}" not found on the provided PrismaClient.`);
    return delegate;
  }

  async findAll(model: string, params: ListRequest, ctx: AdapterCrudContext): Promise<{ data: any[]; count: number }> {
    const prismaModel = this.prismaModel(model);
    const reader = new ReadRepository(prismaModel, this, ctx.config, ctx.listSelect, ctx.oneSelect, ctx.configRegistry);
    const [data, count] = await Promise.all([
      reader.findAll(params, ctx.request),
      reader.count(params.filter ?? []),
    ]);
    return { data, count };
  }

  async count(model: string, filter: string[], ctx: AdapterCrudContext): Promise<number> {
    const reader = new ReadRepository(this.prismaModel(model), this, ctx.config, undefined, undefined, ctx.configRegistry);
    return reader.count(filter);
  }

  async findOne(model: string, id: string | number, ctx: AdapterCrudContext): Promise<any | null> {
    const prismaModel = this.prismaModel(model);
    const reader = new ReadRepository(prismaModel, this, ctx.config, ctx.listSelect, ctx.oneSelect, ctx.configRegistry);
    try {
      return await reader.findOne(id, ctx.request);
    } catch (e: any) {
      if (e instanceof NotFoundException) return null;
      throw e;
    }
  }

  async create(model: string, data: unknown, ctx: AdapterCrudContext): Promise<any> {
    return new WriteRepository(this.prismaModel(model), this, ctx.config).create(data, ctx.request);
  }

  async update(model: string, id: string | number, data: unknown, ctx: AdapterCrudContext): Promise<any> {
    return new WriteRepository(this.prismaModel(model), this, ctx.config).update(id, data, ctx.request);
  }

  async patch(model: string, id: string | number, data: unknown, ctx: AdapterCrudContext): Promise<any> {
    return new WriteRepository(this.prismaModel(model), this, ctx.config).patch(id, data, ctx.request);
  }

  async delete(model: string, id: string | number, ctx: AdapterCrudContext): Promise<any> {
    return new WriteRepository(this.prismaModel(model), this, ctx.config).delete(id, ctx.request);
  }

  async findAllByParent(model: string, parentId: string | number, sub: any, params: ListRequest, ctx: AdapterCrudContext): Promise<{ data: any[]; count: number }> {
    const reader = new ReadRepository(this.prismaModel(model), this, ctx.config, ctx.listSelect, ctx.oneSelect, ctx.configRegistry);
    return reader.findAllByParent(parentId, sub.childRoute, params, ctx.request);
  }

  async findOneChild(model: string, sub: any, childId: string | number, parentId: string | number | undefined, ctx: AdapterCrudContext): Promise<any | null> {
    const reader = new ReadRepository(this.prismaModel(model), this, ctx.config, ctx.listSelect, ctx.oneSelect, ctx.configRegistry);
    try {
      return await reader.findOneChild(sub, childId, parentId, ctx.request);
    } catch (e: any) {
      if (e instanceof NotFoundException) return null;
      throw e;
    }
  }

  async createChild(model: string, parentId: string | number, sub: any, data: unknown, ctx: AdapterCrudContext): Promise<any> {
    return new WriteRepository(this.prismaModel(model), this, ctx.config).createChild(parentId, sub, data, ctx.request);
  }

  async updateChild(model: string, sub: any, childId: string | number, data: unknown, ctx: AdapterCrudContext): Promise<any> {
    return new WriteRepository(this.prismaModel(model), this, ctx.config).updateChild(sub, childId, data, ctx.request);
  }

  async deleteChild(model: string, sub: any, childId: string | number, parentId: string | number | undefined, ctx: AdapterCrudContext): Promise<any> {
    return new WriteRepository(this.prismaModel(model), this, ctx.config).deleteChild(sub, childId, parentId, ctx.request);
  }
}
