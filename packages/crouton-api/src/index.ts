export * from './lib/crouton-api.module';
export type { CroutonAppConfig } from './lib/crud/app-config';
export { getCroutonUser } from './lib/crud/auth';
export type { CroutonUser } from './lib/crud/auth';
export * from './lib/crud/loader/index';
export * from './lib/crud/loader/resource-config.loader';
export * from './lib/crud/loader/fs-resource-config.loader';
export * from './lib/crud/resource-config.registry';
export { applyResourceTagDescriptions } from './lib/crud/openapi-tags';
export * from './lib/crud/data-access/adapter';
export * from './lib/crud/crud.config';
export * from './lib/crud/hooks';
export * from './lib/crud/security';

// Types a consumer needs to type their own `repository.ts` on a
// `kind: "custom"` resource.
export {
  type CustomListResult,
  type CustomOp,
  type CustomRepository,
  type CustomRepositoryContext,
} from './lib/crud/custom-repository';

export type { CrudContext, CrudOp, DataSourceResolver, ParentContext } from './lib/crud/context';
export { buildCrudContext, toRepositoryContext } from './lib/crud/context';

export { parseFilterString } from '@ghentcdh/crouton-core';

export type {
  CroutonRequest,
  PrismaClientLike,
  PrismaDelegateLike,
  PrismaOrderBy,
  PrismaSelect,
  PrismaWhere,
} from './lib/crud/types';
export { getDelegate } from './lib/crud/types';
