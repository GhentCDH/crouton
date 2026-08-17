export {
  CUSTOM_OPS,
  type CustomListResult,
  type CustomOp,
  type CustomRepository,
  type CustomRepositoryContext,
  CustomRepositorySchema,
} from './custom-repository.types';
export {
  REPOSITORY_MODULE,
  loadCustomRepository,
} from './custom-repository.loader';
export {
  type DataSourceResolver,
  createCustomRepository,
} from './custom-repository.adapter';
export { validateCustomRepository } from './custom-repository.validate';
