export { buildViews } from '@ghentcdh/crouton-core';

export * from './lib/crouton-api.module';
export * from './lib/crud/loader/index';
export * from './lib/crud/loader/resource-config.loader';
export * from './lib/crud/loader/fs-resource-config.loader';
export * from './lib/crud/resource-config.registry';
export * from './lib/crud/data-source';
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

// Filter-grammar helpers, so a custom repository can reuse the
// `field:value:operator` parsing instead of reimplementing it.
export {
  buildFilterWhere,
  parseFilterString,
} from './lib/crud/read.repository';
