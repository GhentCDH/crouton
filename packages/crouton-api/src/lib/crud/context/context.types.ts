import type { DataSourceAdapter } from '../data-access/adapter';
import type { Resource } from '../resource/ResourceConfig.schema';

export type CrudOp = 'findAll' | 'findOne' | 'create' | 'update' | 'patch' | 'delete';
export type ReadOp = Extract<CrudOp, 'findAll' | 'findOne'>;
export type WriteOp = Exclude<CrudOp, ReadOp>;

export interface ParentContext {
  route: string;
  param: string;
  id: string | number;
}

export type DataSourceResolver = {
  resolve(name?: string): unknown;
  entries(): { name: string; client: unknown }[];
  resolveAdapter?(name?: string): DataSourceAdapter;
};

/**
 * Shared base context for hook handlers and custom-repository implementations.
 *
 * Both sides share `prisma`, `op`, `id`, `request` and `parent`.
 * Hook contexts extend this with `dataSource` required.
 * Repo contexts extend this with `config`, `dataSources` and `offset` required.
 *
 * Fields that one side requires but the other doesn't have yet are kept optional
 * here — phase 2 wires them into the runtime factories and makes them non-optional.
 */
export interface CrudContext<PRISMA = unknown, OP extends CrudOp = CrudOp> {
  op: OP;
  /**
   * Raw backend client.
   * @deprecated prefer `dataSource.client` — available on hook contexts now,
   * will be available on repo contexts in phase 2.
   */
  prisma: PRISMA;
  id?: string | number;
  request?: unknown;
  parent?: ParentContext;
  /** Datasource adapter for this resource. Required on hook contexts; added to repo contexts in phase 2. */
  dataSource?: DataSourceAdapter;
  /** All datasource adapters registered for this project. Required on repo contexts. */
  dataSources?: DataSourceResolver;
  /** The compiled resource config. Required on repo contexts. */
  config?: Resource;
}
