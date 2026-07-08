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

export const loadSubResourceHooks = async (
  subResources: SubResourceConfig[],
  basePath: string,
): Promise<void> => {
  for (const sub of subResources) {
    const file = sub.name
      ? findModule(join(basePath, 'hooks'), sub.name)
      : undefined;
    if (!file) continue;
    const hooks = await importDefault<ResourceHooks>(file);
    if (hooks) (sub as any).hooks = hooks;
  }
};