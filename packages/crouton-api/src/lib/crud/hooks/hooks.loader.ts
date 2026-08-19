import type { ResourceHooks } from './hooks.types';
import { findModule, importDefault } from '../loader/module.loader';
import type { SubResourceConfig } from '../resource/SubResource.schema';
import { join } from 'node:path';

export const loadResourceHooks = async (
  basePath: string,
): Promise<ResourceHooks | undefined> => {
  const file = findModule(basePath, 'hooks');
  return file ? importDefault<ResourceHooks>(file) : undefined;
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
): Promise<void> => {
  for (const sub of subResources) {
    const file =
      (sub.name ? findModule(join(basePath, 'hooks'), sub.name) : undefined) ??
      (sub.childDir ? findModule(sub.childDir, 'hooks') : undefined);
    if (!file) continue;
    const hooks = await importDefault<ResourceHooks>(file);
    if (hooks) (sub as any).hooks = hooks;
  }
};