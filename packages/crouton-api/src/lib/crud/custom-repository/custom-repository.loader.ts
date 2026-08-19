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

/**
 * Attach each custom sub-resource's `repository.ts` to its `SubResourceConfig`.
 *
 * A sub-resource is declared by a relation column on the parent and served by
 * the parent's controller, but a `kind: "custom"` child owns its own data
 * access — so the parent's repository delegates to this. Mirrors
 * `loadSubResourceHooks`, which attaches child hooks the same way.
 *
 * Mutates in place, because `buildSubResources` has already produced the
 * configs by the time the loader can resolve the child directories.
 */
export const loadSubResourceRepositories = async (
  subResources: { childKind?: string; childDir?: string; childRoute: string; repository?: unknown }[],
  parentName: string,
): Promise<void> => {
  for (const sub of subResources) {
    if (sub.childKind !== 'custom') continue;
    if (!sub.childDir) {
      resourceLoadErrorsRegistry.record({
        name: parentName,
        path: sub.childRoute,
        error:
          `Sub-resource "${sub.childRoute}" is a custom resource but its directory could not be resolved, ` +
          'so its repository.ts cannot be loaded. Check the relation column\'s "resource" path.',
      });
      continue;
    }
    const repository = await loadCustomRepository(
      sub.childDir,
      `${parentName}.${sub.childRoute}`,
    );
    if (repository) sub.repository = repository;
  }
};
