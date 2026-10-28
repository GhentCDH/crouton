import { NotFoundException, NotImplementedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResourceJsonSchema } from '@ghentcdh/crouton-core';

import { createCustomRepository } from './custom-repository.adapter';
import type { CustomRepository } from './custom-repository.types';
import { fromJson } from '../adapter';
import type { Resource } from '../resource/ResourceConfig.schema';
import { invalid } from '../test-utils';

const listParams = (over: Record<string, unknown> = {}) => ({
  page: 1,
  pageSize: 20,
  sort: 'id',
  sortDir: 'asc' as const,
  filter: [] as string[],
  include: [] as string[],
  ...over,
});

const buildConfig = (
  over: Record<string, unknown> = {},
  hooks?: Resource['hooks'],
): Resource => {
  const json = ResourceJsonSchema.parse({
    name: 'zotero_item',
    route: 'zotero-items',
    tag: 'Zotero',
    kind: 'custom',
    operations: {},
    columns: {
      id: { type: 'string', idField: true },
      title: { type: 'string', searchable: true, sortable: true },
    },
    ...over,
  });
  return fromJson(json, undefined, hooks);
};

const dataSources = { resolve: () => undefined, entries: () => [] };

type FindAllCtx = {
  op: string;
  offset: number;
  prisma: unknown;
  dataSources: unknown;
  config: Record<string, unknown>;
  request?: unknown;
};

const make = (
  repository: CustomRepository | undefined,
  config: Resource = buildConfig(),
  prisma: unknown = undefined,
) => createCustomRepository(prisma, config, dataSources, repository);

describe('createCustomRepository', () => {
  describe('findAll', () => {
    it('returns rows and count through findAllWithCount', async () => {
      const repo = make({
        findAll: async () => ({ data: [{ id: 'a' }, { id: 'b' }], count: 42 }),
      });
      await expect(repo.findAllWithCount!(listParams())).resolves.toEqual({
        data: [{ id: 'a' }, { id: 'b' }],
        count: 42,
      });
    });

    it('exposes findAll for callers that only want rows', async () => {
      const repo = make({
        findAll: async () => ({ data: [{ id: 'a' }], count: 1 }),
      });
      await expect(repo.findAll(listParams())).resolves.toEqual([{ id: 'a' }]);
    });

    it('falls back to the row count when count is missing', async () => {
      const repo = make({
        findAll: async () => invalid<{ data: unknown[]; count: number }>({ data: [{ id: 'a' }] }),
      });
      const { count } = await repo.findAllWithCount!(listParams());
      expect(count).toBe(1);
    });

    it('passes params and a context through', async () => {
      const findAll = vi.fn(async () => ({ data: [], count: 0 }));
      const prisma = { $queryRaw: vi.fn() };
      const config = buildConfig();
      const repo = make({ findAll }, config, prisma);

      await repo.findAll(listParams({ page: 3, pageSize: 10 }));

      const [params, ctx] = invalid<[Record<string, unknown>, FindAllCtx]>(findAll.mock.calls[0]);
      expect(params.page).toBe(3);
      expect(ctx.op).toBe('findAll');
      expect(ctx.offset).toBe(20);
      expect(ctx.prisma).toBe(prisma);
      expect(ctx.dataSources).toBe(dataSources);
      expect(ctx.config.name).toBe('zotero_item');    });

    it('forwards the HTTP request into ctx', async () => {
      const findAll = vi.fn(async () => ({ data: [], count: 0 }));
      const repo = make({ findAll });
      const request = { user: { id: 'u1' } };

      await repo.findAll(listParams(), request);

      const [, ctx] = invalid<[unknown, FindAllCtx]>(findAll.mock.calls[0]);
      expect(ctx.request).toBe(request);
    });

    it('omits request from ctx when the controller supplies none', async () => {
      const findAll = vi.fn(async () => ({ data: [], count: 0 }));
      const repo = make({ findAll });

      await repo.findAll(listParams());

      const [, ctx] = invalid<[unknown, FindAllCtx]>(findAll.mock.calls[0]);
      expect('request' in ctx).toBe(false);
    });

    it('derives count() from findAll for the generic code path', async () => {
      const findAll = vi.fn(async () => ({ data: [], count: 7 }));
      const repo = make({ findAll });
      await expect(repo.count(['title:foo'])).resolves.toBe(7);
      const [params] = invalid<[Record<string, unknown>]>(findAll.mock.calls[0]);
      expect(params.filter).toEqual(['title:foo']);
    });
  });

  describe('findOne', () => {
    it('returns the row', async () => {
      const repo = make({ findOne: async (id) => ({ id, title: 'x' }) });
      await expect(repo.findOne('abc')).resolves.toEqual({
        id: 'abc',
        title: 'x',
      });
    });

    it('throws NotFound when the repository returns null', async () => {
      const repo = make({ findOne: async () => null });
      await expect(repo.findOne('abc')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('forwards the request into ctx', async () => {
      const findOne = vi.fn(async (id: string | number) => ({ id }));
      const request = { user: { id: 'u1' } };
      await make({ findOne }).findOne('abc', request);
      expect(((findOne.mock.calls[0] as unknown[])[1] as Record<string, unknown>)['request']).toBe(request);
    });

    it('coerces the id per idType', async () => {
      const findOne = vi.fn(async (id: string | number) => ({ id }));
      const numeric = buildConfig({ source: { idType: 'number' } });
      await make({ findOne }, numeric).findOne('42');
      expect(findOne.mock.calls[0][0]).toBe(42);

      const findOneStr = vi.fn(async (id: string | number) => ({ id }));
      await make({ findOne: findOneStr }).findOne(42);
      expect(findOneStr.mock.calls[0][0]).toBe('42');
    });
  });

  describe('writes', () => {
    it('routes create/update/delete to the repository', async () => {
      const repository = {
        create: vi.fn(async (data: unknown) => ({ id: 'new', ...(data as Record<string, unknown>) })),
        update: vi.fn(async (id: string | number, data: unknown) => ({ id, ...(data as Record<string, unknown>) })),
        delete: vi.fn(async (id: string | number) => ({ id })),
      };
      const repo = make(repository);

      await expect(repo.create({ title: 'a' })).resolves.toEqual({
        id: 'new',
        title: 'a',
      });
      await expect(repo.update('1', { title: 'b' })).resolves.toEqual({
        id: '1',
        title: 'b',
      });
      await expect(repo.delete('1')).resolves.toEqual({ id: '1' });
    });

    it('forwards the request into ctx and into the write hooks', async () => {
      const seen: unknown[] = [];
      const config = buildConfig(
        {},
        {
          beforeWrite: (data: unknown, ctx: unknown) => {
            seen.push((ctx as Record<string, unknown>)['request']);
            return data;
          },
          afterWrite: (result: unknown, ctx: unknown) => {
            seen.push((ctx as Record<string, unknown>)['request']);
            return result;
          },
        },
      );
      const create = vi.fn(async (data: Record<string, unknown>) => data);
      const request = { user: { id: 'u1' } };

      await make({ create }, config).create({ title: 'a' }, request);

      // beforeWrite, the repository's own ctx, and afterWrite all see it.
      expect(((create.mock.calls[0] as unknown[])[1] as Record<string, unknown>)['request']).toBe(request);
      expect(seen).toEqual([request, request]);
    });

    it('falls back to update when patch is not implemented', async () => {
      const update = vi.fn(async (id: unknown, data: Record<string, unknown>, ctx: unknown) => ({
        id,
        ...data,
        ctx,
      }));
      const repo = make({ update });
      await repo.patch('1', { title: 'b' });
      expect(update).toHaveBeenCalledTimes(1);
      // The op reported to the repository is the one that was actually called.
      expect(((update.mock.calls[0]![2]) as Record<string, unknown>)['op']).toBe('patch');
    });

    it('prefers patch when implemented', async () => {
      const patch = vi.fn(async (id: string | number, data: unknown) => ({ id, ...(data as Record<string, unknown>) }));
      const update = vi.fn(async (id: string | number, data: unknown) => ({ id, ...(data as Record<string, unknown>) }));
      const repo = make({ patch, update });
      await repo.patch('1', { title: 'b' });
      expect(patch).toHaveBeenCalledTimes(1);
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('hooks', () => {
    it('applies afterRead to every listed row', async () => {
      const config = buildConfig({}, {
        afterRead: (row: unknown) => ({ ...(row as Record<string, unknown>), seen: true }),
      });
      const repo = make(
        { findAll: async () => ({ data: [{ id: 'a' }, { id: 'b' }], count: 2 }) },
        config,
      );
      const { data } = await repo.findAllWithCount!(listParams());
      expect(data).toEqual([
        { id: 'a', seen: true },
        { id: 'b', seen: true },
      ]);
    });

    it('applies afterRead to a single row', async () => {
      const config = buildConfig({}, {
        afterRead: (row: unknown) => ({ ...(row as Record<string, unknown>), seen: true }),
      });
      const repo = make({ findOne: async (id) => ({ id }) }, config);
      await expect(repo.findOne('a')).resolves.toEqual({
        id: 'a',
        seen: true,
      });
    });

    it('applies beforeWrite and afterWrite around a create', async () => {
      const config = buildConfig({}, {
        beforeWrite: (data: unknown) => ({ ...(data as Record<string, unknown>), slug: 'from-hook' }),
        afterWrite: (result: unknown) => ({ ...(result as Record<string, unknown>), wrote: true }),
      });
      const create = vi.fn(async (data: unknown) => data);
      const repo = make({ create }, config);

      await expect(repo.create({ title: 'a' })).resolves.toEqual({
        title: 'a',
        slug: 'from-hook',
        wrote: true,
      });
      expect(create.mock.calls[0][0]).toEqual({
        title: 'a',
        slug: 'from-hook',
      });
    });
  });

  describe('unimplemented operations', () => {
    let repo: ReturnType<typeof make>;
    beforeEach(() => {
      repo = make({});
    });

    it('throws NotImplemented naming the resource and operation', async () => {
      await expect(repo.findAll(listParams())).rejects.toThrow(
        /zotero_item.*findAll/,
      );
      await expect(repo.findOne('1')).rejects.toBeInstanceOf(
        NotImplementedException,
      );
      await expect(repo.create({})).rejects.toBeInstanceOf(
        NotImplementedException,
      );
      await expect(repo.delete('1')).rejects.toBeInstanceOf(
        NotImplementedException,
      );
    });

    it('rejects sub-resource operations', async () => {
      await expect(
        repo.findAllByParent('1', 'children', listParams()),
      ).rejects.toThrow(/sub-resource/);
    });

    it('throws when the repository is missing entirely', async () => {
      await expect(make(undefined).findAll(listParams())).rejects.toBeInstanceOf(
        NotImplementedException,
      );
    });
  });
});
