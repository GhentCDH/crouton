import { findModule, importDefault } from '../../../loader/module.loader';
import type { SubResourceConfig } from '../../../resource/SubResource.schema';
import type { ResourceHooks } from './hooks.types';
import { join } from 'node:path';

/** Called when a hooks file exists but fails to import. */
export type HooksImportError = (error: unknown, filePath: string) => void;

/**
 * Load a resource's `hooks.ts`. An import failure is reported through
 * `onError` — callers must not serve the resource without its hooks, since
 * hooks typically carry access control (#574).
 */
export const loadResourceHooks = async (
  basePath: string,
  onError?: HooksImportError,
): Promise<ResourceHooks | undefined> => {
  const file = findModule(basePath, 'hooks');
  return file ? importDefault<ResourceHooks>(file, onError) : undefined;
};

/**
 * Attach each sub-resource's hooks.
 *
 * Two locations, checked in order:
 *
 * 1. `<parent>/hooks/<childName>.ts` — the original convention, which keeps every
 *    child's hooks together under the parent that serves them.
 * 2. `<childDir>/hooks.ts` — the child's own directory, same filename a top-level
 *    resource uses.
 *
 * The second exists because a child with its own directory already keeps
 * `resource.json` and (for `kind: "custom"`) `repository.ts` there, so putting
 * `hooks.ts` beside them is the obvious guess — and until it was supported that
 * file was silently ignored, with no error and no status-page entry.
 *
 * The parent-scoped location wins when both are present, so nothing that relied on
 * convention 1 changes behaviour.
 */
export const loadSubResourceHooks = async (
  subResources: SubResourceConfig[],
  basePath: string,
  onError?: (error: unknown, filePath: string, sub: SubResourceConfig) => void,
): Promise<void> => {
  for (const sub of subResources) {
    const file =
      (sub.name ? findModule(join(basePath, 'hooks'), sub.name) : undefined) ??
      (sub.childDir ? findModule(sub.childDir, 'hooks') : undefined);
    if (!file) continue;
    const hooks = await importDefault<ResourceHooks>(
      file,
      onError && ((error, filePath) => onError(error, filePath, sub)),
    );
    if (hooks) Object.assign(sub, { hooks });
  }
};