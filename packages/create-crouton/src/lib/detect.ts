/**
 * NX workspace detection and app classification.
 */

import { existsSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface NxApp {
  name: string;
  dir: string; // absolute
  relDir: string; // relative to cwd, e.g. "apps/backend"
  kind: 'backend' | 'frontend' | 'unknown';
}

export const isNxWorkspace = (cwd: string): boolean => existsSync(join(cwd, 'nx.json'));

const hasAnyDep = (deps: Record<string, string>, ...keys: string[]): boolean =>
  keys.some((k) => k in deps);

const classifyApp = (pkg: Record<string, unknown>): NxApp['kind'] => {
  const all = {
    ...(pkg['dependencies'] as Record<string, string> ?? {}),
    ...(pkg['devDependencies'] as Record<string, string> ?? {}),
  };
  if (hasAnyDep(all, '@nestjs/core', '@nestjs/common', '@ghentcdh/crouton-api')) return 'backend';
  if (hasAnyDep(all, 'vue', 'vite', '@vitejs/plugin-vue', '@ghentcdh/crouton-vue')) return 'frontend';
  return 'unknown';
};

export const discoverNxApps = async (cwd: string): Promise<NxApp[]> => {
  const appsDir = join(cwd, 'apps');
  if (!existsSync(appsDir)) return [];

  const entries = readdirSync(appsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const apps: NxApp[] = [];
  for (const entry of entries) {
    const dir = join(appsDir, entry);
    const pkgPath = join(dir, 'package.json');
    let kind: NxApp['kind'] = 'unknown';
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
        kind = classifyApp(pkg);
      } catch {
        // ignore parse errors
      }
    }
    apps.push({ name: entry, dir, relDir: `apps/${entry}`, kind });
  }
  return apps;
};

/** Detect the package manager from lockfiles in cwd. */
export const detectPm = (cwd: string): string => {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(cwd, 'bun.lockb'))) return 'bun';
  // check npm_config_user_agent env
  const ua = process.env['npm_config_user_agent'] ?? '';
  if (ua.startsWith('pnpm')) return 'pnpm';
  if (ua.startsWith('yarn')) return 'yarn';
  if (ua.startsWith('bun')) return 'bun';
  return 'npm';
};
