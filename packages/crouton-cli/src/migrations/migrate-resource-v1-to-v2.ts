import type { Tree } from '@nx/devkit';
import { visitNotIgnoredFiles } from '@nx/devkit';

import { migration_v1_to_v2, runResourceMigrations } from '@ghentcdh/crouton-core';

export default async function migrateResourceV1ToV2(tree: Tree): Promise<void> {
  visitNotIgnoredFiles(tree, '.', (filePath) => {
    if (!filePath.endsWith('resource.json')) return;

    const content = tree.read(filePath, 'utf-8');
    if (!content) return;

    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      console.warn(`[crouton migrate] skipping ${filePath}: invalid JSON`);
      return;
    }

    try {
      const result = runResourceMigrations(raw as Record<string, unknown>, 2, [migration_v1_to_v2]);
      if (result.applied.length > 0) {
        tree.write(filePath, JSON.stringify(result.raw, null, 2) + '\n');
        console.warn(`[crouton migrate] ${filePath}: ${result.applied.join(', ')}`);
      }
    } catch (e) {
      console.warn(`[crouton migrate] skipping ${filePath}: ${(e as Error).message}`);
    }
  });
}
