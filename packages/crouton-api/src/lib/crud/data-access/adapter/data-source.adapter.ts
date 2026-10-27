import type { ListRequest } from '@ghentcdh/crouton-core';

import type { Resource } from '../../resource/ResourceConfig.schema';
import type { ResourceConfigRegistry } from '../../resource-config.registry';
import type { SubResourceConfig } from '../../resource/SubResource.schema';

export interface AdapterCrudContext {
  config: Resource;
  op: string;
  request?: unknown;
  offset: number;
  listSelect?: Record<string, unknown>;
  oneSelect?: Record<string, unknown>;
  configRegistry?: ResourceConfigRegistry;
  /** Free-text search term forwarded from `?q=` for OR search in `ReadRepository`. */
  q?: string;
}

/**
 * Per-datasource, resource-keyed data-access contract.
 *
 * Prisma is the default adapter (`kind: "prisma"`). A developer can supply a
 * `custom` adapter by setting `adapter: "custom"` in `data-source.json` and
 * exporting a `DataSourceAdapter` (or factory) from the datasource `index.ts`.
 *
 * Phase 1 (lifecycle) + Phase 2 (CRUD surface): the CRUD methods are optional
 * so existing adapters and tests that only set up lifecycle are unaffected.
 * A subclass of `PrismaDataSourceAdapter` can override any CRUD method to
 * intercept or enrich data without reimplementing the rest.
 */
export interface DataSourceAdapter {
  readonly kind: string;
  /**
   * Raw backend handle — the escape hatch for action procedures and
   * `ctx.prisma`. `undefined` on a non-Prisma adapter.
   */
  readonly client?: unknown;

  /**
   * Database provider for placeholder syntax in raw SQL queries.
   * Set automatically for Prisma adapters by reading the Prisma client's
   * internal `_activeProvider`. Values: `'postgresql' | 'sqlite' | 'mysql' | 'cockroachdb'`.
   */
  readonly provider?: string;

  /** Return `true` when this adapter can serve the given model key. */
  supports?(model: string): boolean;

  /**
   * Probe the datasource. Throw on failure; the status service catches it and
   * reports `connected: false`. Omit on adapters that have no meaningful probe
   * (in-memory, custom REST) — the status page will report them as connected
   * without probing.
   */
  healthCheck?(): Promise<void>;

  connect?(): Promise<void>;
  disconnect?(): Promise<void>;

  // ── CRUD surface (Phase 2) ────────────────────────────────────────────────
  // All optional. When present, `createCrudRepository` routes through these
  // instead of constructing ReadRepository/WriteRepository directly, so a
  // subclass can override individual methods without re-implementing the rest.

  findAll?(model: string, params: ListRequest, ctx: AdapterCrudContext): Promise<{ data: unknown[]; count: number }>;
  count?(model: string, filter: string[], ctx: AdapterCrudContext): Promise<number>;
  findOne?(model: string, id: string | number, ctx: AdapterCrudContext): Promise<unknown | null>;
  create?(model: string, data: unknown, ctx: AdapterCrudContext): Promise<unknown>;
  update?(model: string, id: string | number, data: unknown, ctx: AdapterCrudContext): Promise<unknown>;
  patch?(model: string, id: string | number, data: unknown, ctx: AdapterCrudContext): Promise<unknown>;
  delete?(model: string, id: string | number, ctx: AdapterCrudContext): Promise<unknown>;

  // Sub-resource operations — optional even on a full adapter (custom adapters
  // that cannot derive sub-resource relations simply omit these).
  findAllByParent?(model: string, parentId: string | number, sub: SubResourceConfig, params: ListRequest, ctx: AdapterCrudContext): Promise<{ data: unknown[]; count: number }>;
  findOneChild?(model: string, sub: SubResourceConfig, childId: string | number, parentId: string | number | undefined, ctx: AdapterCrudContext): Promise<unknown | null>;
  createChild?(model: string, parentId: string | number, sub: SubResourceConfig, data: unknown, ctx: AdapterCrudContext): Promise<unknown>;
  updateChild?(model: string, sub: SubResourceConfig, childId: string | number, data: unknown, ctx: AdapterCrudContext): Promise<unknown>;
  deleteChild?(model: string, sub: SubResourceConfig, childId: string | number, parentId: string | number | undefined, ctx: AdapterCrudContext): Promise<unknown>;
}
