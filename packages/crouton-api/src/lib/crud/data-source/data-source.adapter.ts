/**
 * Per-datasource, resource-keyed data-access contract.
 *
 * Prisma is the default adapter (`kind: "prisma"`). A developer can supply a
 * `custom` adapter by setting `adapter: "custom"` in `data-source.json` and
 * exporting a `DataSourceAdapter` (or factory) from the datasource `index.ts`.
 *
 * Phase 1: only the lifecycle interface is required. CRUD methods will move
 * here in phase 2 when hooks are hoisted out of the Prisma repositories.
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
}
