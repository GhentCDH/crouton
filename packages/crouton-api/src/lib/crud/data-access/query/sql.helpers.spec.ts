import { describe, expect, it } from 'vitest';

import type { SubResourceConfig } from './resource/SubResource.schema';
import { buildFindOneIncludes } from './sql.helpers';

const sub = (overrides: Partial<SubResourceConfig>): SubResourceConfig =>
  ({
    column: 'col',
    relation: 'rel',
    childRoute: 'child',
    childModel: 'child',
    foreignKey: 'parentId',
    operations: {},
    ...overrides,
  }) as SubResourceConfig;

describe('buildFindOneIncludes', () => {
  it('sub-resources with includeInFindOne only → { rel: true }', () => {
    const subs = [sub({ relation: 'author', includeInFindOne: true })];
    expect(buildFindOneIncludes(subs, undefined)).toEqual({ author: true });
  });

  it('sub-resource with findOneOrderBy → { rel: { orderBy: ... } }', () => {
    const subs = [
      sub({
        relation: 'items',
        includeInFindOne: true,
        findOneOrderBy: { title: 'asc' },
      }),
    ];
    expect(buildFindOneIncludes(subs, undefined)).toEqual({
      items: { orderBy: { title: 'asc' } },
    });
  });

  it('merge with configInclude → configInclude wins on overlap', () => {
    const subs = [sub({ relation: 'author', includeInFindOne: true })];
    const configInclude = { author: { include: { books: true } } };
    const result = buildFindOneIncludes(subs, configInclude);
    // configInclude spread last → wins
    expect(result).toEqual({ author: { include: { books: true } } });
  });

  it('non-overlapping merge', () => {
    const subs = [sub({ relation: 'tags', includeInFindOne: true })];
    const configInclude = { author: { include: { books: true } } };
    const result = buildFindOneIncludes(subs, configInclude);
    expect(result).toEqual({
      tags: true,
      author: { include: { books: true } },
    });
  });

  it('empty inputs → undefined', () => {
    expect(buildFindOneIncludes([], undefined)).toBeUndefined();
  });

  it('no includeInFindOne subs but has configInclude → configInclude only', () => {
    const subs = [sub({ relation: 'hidden', includeInFindOne: false })];
    const configInclude = { author: true };
    expect(buildFindOneIncludes(subs, configInclude)).toEqual({ author: true });
  });
});
