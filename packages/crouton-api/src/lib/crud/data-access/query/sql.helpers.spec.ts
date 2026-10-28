import { describe, expect, it, vi } from 'vitest';

import type {
  CalculatedColumn,
} from '@ghentcdh/crouton-core';

import { buildFindOneIncludes, mergeCalculatedColumnsForRows } from './sql.helpers';
import type { SubResourceConfig } from '../../resource/SubResource.schema';
import { invalid } from '../../test-utils';

// ── Minimal type helpers ─────────────────────────────────────────────────

interface CalculatedColumnMock {
  id: string;
  alias?: string;
  type: 'string' | 'boolean' | 'number';
  sqlExpression: string;
}

const calcCol = (overrides: Partial<CalculatedColumnMock> = {}): CalculatedColumn =>
  invalid<CalculatedColumn>({
    id: 'calc',
    type: 'string',
    sqlExpression: 'main.status',
    ...overrides,
  });

const sub = (overrides: Partial<SubResourceConfig>): SubResourceConfig =>
  invalid<SubResourceConfig>({
    column: 'col',
    relation: 'rel',
    childRoute: 'child',
    childModel: 'child',
    foreignKey: 'parentId',
    operations: {},
    ...overrides,
  });

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

// ── mergeCalculatedColumnsForRows ─────────────────────────────────────────

describe('mergeCalculatedColumnsForRows', () => {
  const fakeRows = [
    { id: '1', title: 'A' },
    { id: '2', title: 'B' },
  ];

  /** Create a mock prisma that records the last SQL sent to $queryRawUnsafe. */
  type WithRawQuery = { $queryRawUnsafe(query: string, ...values: unknown[]): Promise<unknown> };
  const mockPrisma = (): { client: WithRawQuery; lastSql: () => string | undefined } => {
    let lastSql: string | undefined;
    const client = {
      $queryRawUnsafe: vi.fn(async (sql: string, ..._args: unknown[]) => {
        lastSql = sql;
        // Simulate a successful empty result set so merge proceeds without error.
        return [];
      }),
    };
    return { client, lastSql: () => lastSql };
  };

  const col = (overrides?: Partial<CalculatedColumnMock>): CalculatedColumn =>
    calcCol(overrides);

  // ── Placeholder dialect ────────────────────────────────────────────────

  it('uses $1, $2, … placeholders for postgresql provider', async () => {
    const { client, lastSql } = mockPrisma();
    await mergeCalculatedColumnsForRows(
      fakeRows,
      [col()],
      'books',
      client,
      'id',
      'postgresql',
    );
    expect(lastSql()).toContain('IN ($1, $2)');
  });

  it('uses $1, $2, … placeholders for cockroachdb provider', async () => {
    const { client, lastSql } = mockPrisma();
    await mergeCalculatedColumnsForRows(
      fakeRows,
      [col()],
      'books',
      client,
      'id',
      'cockroachdb',
    );
    expect(lastSql()).toContain('IN ($1, $2)');
  });

  it('uses ?, ? placeholders for sqlite provider', async () => {
    const { client, lastSql } = mockPrisma();
    await mergeCalculatedColumnsForRows(
      fakeRows,
      [col()],
      'books',
      client,
      'id',
      'sqlite',
    );
    expect(lastSql()).toContain('IN (?, ?)');
  });

  it('uses ?, ? placeholders for mysql provider', async () => {
    const { client, lastSql } = mockPrisma();
    await mergeCalculatedColumnsForRows(
      fakeRows,
      [col()],
      'books',
      client,
      'id',
      'mysql',
    );
    expect(lastSql()).toContain('IN (?, ?)');
  });

  it('defaults to postgresql placeholders when provider is omitted', async () => {
    const { client, lastSql } = mockPrisma();
    await mergeCalculatedColumnsForRows(
      fakeRows,
      [col()],
      'books',
      client,
      'id',
    );
    expect(lastSql()).toContain('IN ($1, $2)');
  });

  // ── SQL structure ──────────────────────────────────────────────────────

  it('includes the CAST expression in the generated SQL', async () => {
    const { client, lastSql } = mockPrisma();
    await mergeCalculatedColumnsForRows(
      fakeRows,
      [col({ type: 'boolean', sqlExpression: 'main.is_active' })],
      'books',
      client,
      'id',
      'postgresql',
    );
    const sql = lastSql()!;
    expect(sql).toContain('CAST((main.is_active) AS BOOLEAN)');
    expect(sql).toContain('FROM "books" main');
    expect(sql).toContain('WHERE main."id" IN ($1, $2)');
  });

  it('uses the custom alias when set', async () => {
    const { client, lastSql } = mockPrisma();
    await mergeCalculatedColumnsForRows(
      fakeRows,
      [col({ alias: 'my_alias', sqlExpression: 'UPPER(main.title)' })],
      'books',
      client,
      'id',
      'postgresql',
    );
    const sql = lastSql()!;
    expect(sql).toContain('AS "my_alias"');
  });

  it('passes the correct ids to $queryRawUnsafe', async () => {
    let capturedArgs: unknown[] | undefined;
    const client = {
      $queryRawUnsafe: vi.fn(async (_sql: string, ...args: unknown[]) => {
        capturedArgs = args;
        return [];
      }),
    };
    await mergeCalculatedColumnsForRows(
      fakeRows,
      [col()],
      'books',
      client,
      'id',
      'postgresql',
    );
    expect(capturedArgs).toEqual(['1', '2']);
  });

  it('returns rows unchanged when there are no calculated columns', async () => {
    const client = {
      $queryRawUnsafe: vi.fn(),
    };
    const result = await mergeCalculatedColumnsForRows(
      fakeRows,
      [],
      'books',
      client,
      'id',
      'postgresql',
    );
    expect(result).toBe(fakeRows);
    expect(client.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('returns rows unchanged when rows array is empty', async () => {
    const client = {
      $queryRawUnsafe: vi.fn(),
    };
    const result = await mergeCalculatedColumnsForRows(
      [],
      [col()],
      'books',
      client,
      'id',
      'postgresql',
    );
    expect(result).toEqual([]);
    expect(client.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  // ── Merging ────────────────────────────────────────────────────────────

  it('merges calculated column values onto rows by id', async () => {
    const client = {
      $queryRawUnsafe: vi.fn(async (_sql: string, ..._args: unknown[]) => [
        { id: '1', calc: 'active' },
        { id: '2', calc: 'inactive' },
      ]),
    };
    const result = await mergeCalculatedColumnsForRows(
      fakeRows,
      [col({ alias: 'calc' })],
      'books',
      client,
      'id',
      'postgresql',
    );
    expect(result).toEqual([
      { id: '1', title: 'A', calc: 'active' },
      { id: '2', title: 'B', calc: 'inactive' },
    ]);
  });

  it('falls back to default value when query returns no row for an id', async () => {
    const client = {
      $queryRawUnsafe: vi.fn(async (_sql: string, ..._args: unknown[]) => [
        { id: '2', calc: 'active' },
      ]),
    };
    const result = await mergeCalculatedColumnsForRows(
      fakeRows,
      [col({ alias: 'calc', type: 'string' })],
      'books',
      client,
      'id',
      'postgresql',
    );
    expect(result).toEqual([
      { id: '1', title: 'A', calc: null },
      { id: '2', title: 'B', calc: 'active' },
    ]);
  });
});
