import type { CustomRepository } from './custom-repository.types';
import { findModule, importDefault } from '../loader/module.loader';
import { resourceLoadErrorsRegistry } from '../resource/resource-load-errors.registry';

export const REPOSITORY_MODULE = 'repository';

/**
 * Load a custom resource's `repository.ts`.
 *
 * Discovery mirrors `loadResourceHooks`: fixed filename, `.ts` then `.js`, no
 * declaration in resource.json. Unlike the hooks loader this distinguishes
 * "absent" from "broken" — an import failure is recorded on the load-error
 * registry (and so shown on the status page) rather than silently yielding
 * `undefined`, which would read as a missing file.
 */
export const loadCustomRepository = async (
  basePath: string,
  resourceName: string,
): Promise<CustomRepository | undefined> => {
  const file = findModule(basePath, REPOSITORY_MODULE);
  if (!file) return undefined;

  let failure: unknown;
  const repository = await importDefault<CustomRepository>(file, (error) => {
    failure = error;
  });

  if (failure !== undefined) {
    resourceLoadErrorsRegistry.record({
      name: resourceName,
      path: file,
      error: `Failed to import ${REPOSITORY_MODULE}: ${
        failure instanceof Error ? failure.message : String(failure)
      }`,
    });
    return undefined;
  }

  if (repository && typeof repository !== 'object') {
    resourceLoadErrorsRegistry.record({
      name: resourceName,
      path: file,
      error: `${REPOSITORY_MODULE} must default-export an object of operation functions.`,
    });
    return undefined;
  }

  return repository;
};
