import type { ListRequest } from '@ghentcdh/crouton-core';

/**
 * Context passed to every adapter CRUD method.
 *
 * Typed loosely (config/configRegistry as `any`) to avoid circular imports:
 * DataSourceAdapter is imported transitively by many modules including the
 * hooks layer which is also referenced from the resource schema.
 */
export interface AdapterCrudContext {
  /** Fully resolved resource config (Resource type). */
  config: any;
  op: string;
  request?: any;
  offset: number;
  /** Prisma `select` clause for list queries (derived from findAll schema). */
  listSelect?: Record<string, any>;
  /** Prisma `select` clause for detail queries (derived from findOne schema). */
  oneSelect?: Record<string, any>;
  /** ResourceConfigRegistry for value-label resolution. */
  configRegistry?: any;
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

  findAll?(model: string, params: ListRequest, ctx: AdapterCrudContext): Promise<{ data: any[]; count: number }>;
  count?(model: string, filter: string[], ctx: AdapterCrudContext): Promise<number>;
  findOne?(model: string, id: string | number, ctx: AdapterCrudContext): Promise<any | null>;
  create?(model: string, data: unknown, ctx: AdapterCrudContext): Promise<any>;
  update?(model: string, id: string | number, data: unknown, ctx: AdapterCrudContext): Promise<any>;
  patch?(model: string, id: string | number, data: unknown, ctx: AdapterCrudContext): Promise<any>;
  delete?(model: string, id: string | number, ctx: AdapterCrudContext): Promise<any>;

  // Sub-resource operations — optional even on a full adapter (custom adapters
  // that cannot derive sub-resource relations simply omit these).
  findAllByParent?(model: string, parentId: string | number, sub: any, params: ListRequest, ctx: AdapterCrudContext): Promise<{ data: any[]; count: number }>;
  findOneChild?(model: string, sub: any, childId: string | number, parentId: string | number | undefined, ctx: AdapterCrudContext): Promise<any | null>;
  createChild?(model: string, parentId: string | number, sub: any, data: unknown, ctx: AdapterCrudContext): Promise<any>;
  updateChild?(model: string, sub: any, childId: string | number, data: unknown, ctx: AdapterCrudContext): Promise<any>;
  deleteChild?(model: string, sub: any, childId: string | number, parentId: string | number | undefined, ctx: AdapterCrudContext): Promise<any>;
}
