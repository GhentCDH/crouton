import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { fileExists } from './files';

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

/**
 * Detect the package manager from lockfile presence.
 */
export const detectPackageManager = async (cwd: string): Promise<PackageManager | undefined> => {
  if (await fileExists(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fileExists(join(cwd, 'bun.lockb'))) return 'bun';
  if (await fileExists(join(cwd, 'yarn.lock'))) return 'yarn';
  if (await fileExists(join(cwd, 'package-lock.json'))) return 'npm';
  return undefined;
};

/**
 * Check if project root has nx.json → Nx workspace.
 */
export const isNxProject = async (cwd: string): Promise<boolean> =>
  fileExists(join(cwd, 'nx.json'));

export interface DiscoveredApp {
  name: string;
  path: string;
  kind: 'backend' | 'frontend' | 'unknown';
}

/**
 * Scan apps/ subdirs, classify by package.json deps.
 */
export const discoverNxApps = async (cwd: string): Promise<DiscoveredApp[]> => {
  const appsDir = join(cwd, 'apps');
  if (!(await fileExists(appsDir))) return [];

  const entries = await readdir(appsDir, { withFileTypes: true });
  const apps: DiscoveredApp[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const appPath = join(appsDir, entry.name);
    const pkgPath = join(appPath, 'package.json');
    let kind: DiscoveredApp['kind'] = 'unknown';

    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
      const allDeps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
      };
      if ('@nestjs/core' in allDeps) kind = 'backend';
      else if ('vue' in allDeps || 'vite' in allDeps) kind = 'frontend';
    } catch {
      // no package.json or invalid — leave as unknown
    }

    apps.push({ name: entry.name, path: appPath, kind });
  }

  return apps;
};
