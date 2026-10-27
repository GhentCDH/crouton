export * from './lib/crouton-api.module';
export type { CroutonAppConfig } from './lib/crud/app-config';
export {
  type ParseAppConfig,
  type ParseSchemaInput,
  parseSchema,
} from './lib/crud/parse-schema';
export * from './lib/crud/loader/index';
export * from './lib/crud/loader/resource-config.loader';
export * from './lib/crud/loader/fs-resource-config.loader';
export * from './lib/crud/resource-config.registry';
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

export { parseFilterString } from '@ghentcdh/crouton-core';
