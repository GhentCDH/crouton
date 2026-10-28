import type { JsonObject } from '@ghentcdh/crouton-core';

/**
 * Structural interface for a Prisma delegate (model accessor).
 * Crouton works against any generated PrismaClient, so it never imports the
 * generated types — only this structural shape.
 */
export interface PrismaDelegateLike {
  findMany(args?: unknown): Promise<unknown[]>;
  findFirst(args?: unknown): Promise<unknown | null>;
  findUnique(args?: unknown): Promise<unknown | null>;
  count(args?: unknown): Promise<number>;
  create(args?: unknown): Promise<unknown>;
  update(args?: unknown): Promise<unknown>;
  delete(args?: unknown): Promise<unknown>;
  deleteMany(args?: unknown): Promise<{ count: number }>;
}

/**
 * Structural interface for a PrismaClient instance.
 * Index signature lets callers access model delegates by name.
 */
export interface PrismaClientLike {
  $transaction(fn: (tx: PrismaClientLike) => Promise<unknown>): Promise<unknown>;
  $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  $queryRawUnsafe(query: string, ...values: unknown[]): Promise<unknown>;
  _activeProvider?: string;
  [model: string]: unknown;
}

export const getDelegate = (client: PrismaClientLike, model: string): PrismaDelegateLike | undefined => {
  const delegate = client[model];
  if (delegate && typeof delegate === 'object') return delegate as PrismaDelegateLike;
  return undefined;
};

export type PrismaWhere = JsonObject;
export type PrismaOrderBy = JsonObject | JsonObject[];
export type PrismaSelect = JsonObject;
