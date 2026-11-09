import { describe, expectTypeOf, it } from 'vitest';

import type { CustomRepositoryContext } from '../custom-repository/custom-repository.types';
import type { Resource } from '../resource/ResourceConfig.schema';
import { toRepositoryContext } from './context.helpers';
import type { CrudContext, DataSourceResolver, ParentContext } from './context.types';

type PC = { user: { findUnique: () => Promise<unknown> } };

const stubDataSources: DataSourceResolver = {
  resolve: () => undefined,
  entries: () => [],
};

const stubParent: ParentContext = { route: '/groups', param: 'groupId', id: 'g1' };

type FullCtx<P> = CrudContext<P> & { config: Resource; dataSources: DataSourceResolver };

describe('toRepositoryContext', () => {
  it('preserves the PRISMA generic', () => {
    const ctx: FullCtx<PC> = {
      op: 'create',
      prisma: {} as PC,
      config: {} as Resource,
      dataSources: stubDataSources,
    };
    const repo = toRepositoryContext(ctx);
    expectTypeOf(repo.prisma).toEqualTypeOf<PC>();
  });

  it('result is assignable to CustomRepositoryContext', () => {
    const ctx: FullCtx<unknown> = {
      op: 'findOne',
      prisma: undefined as unknown,
      config: {} as Resource,
      dataSources: stubDataSources,
    };
    expectTypeOf(toRepositoryContext(ctx)).toMatchTypeOf<CustomRepositoryContext<unknown>>();
  });

  it('op override is accepted', () => {
    const ctx: FullCtx<unknown> = {
      op: 'create',
      prisma: undefined as unknown,
      config: {} as Resource,
      dataSources: stubDataSources,
    };
    const repo = toRepositoryContext(ctx, { op: 'findOne' });
    expectTypeOf(repo.op).toEqualTypeOf<
      'findAll' | 'findOne' | 'create' | 'update' | 'patch' | 'delete'
    >();
  });

  it('parent is preserved from base context', () => {
    const ctx: FullCtx<unknown> = {
      op: 'create',
      prisma: undefined as unknown,
      config: {} as Resource,
      dataSources: stubDataSources,
      parent: stubParent,
    };
    const repo = toRepositoryContext(ctx);
    expectTypeOf(repo.parent).toEqualTypeOf<ParentContext | undefined>();
  });
});
