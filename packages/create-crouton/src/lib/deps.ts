/**
 * Missing dependency resolver.
 * Computes which @ghentcdh/* and companion deps are missing from a package.json.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

export interface DepSet {
  deps: string[];
  devDeps: string[];
}

/** Required packages keyed by role. Versions pinned to latest alpha. */
export const REQUIRED_DEPS = {
  backend: {
    deps: [
      '@ghentcdh/crouton-api',
      '@ghentcdh/crouton-core',
      '@prisma/adapter-pg',
      '@nestjs/common',
      '@nestjs/core',
      '@nestjs/platform-fastify',
      'reflect-metadata',
      'zod',
    ],
    devDeps: [
      '@ghentcdh/crouton-cli',
      'prisma',
      'zod-prisma-types',
      '@nestjs/cli',
    ],
  },
  frontend: {
    deps: [
      '@ghentcdh/crouton-vue',
      '@ghentcdh/json-forms-vue',
      'vue',
    ],
    devDeps: [
      'vite',
      '@vitejs/plugin-vue',
    ],
  },
} satisfies Record<string, DepSet>;

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export const readPackageJson = async (pkgPath: string): Promise<PackageJson> => {
  if (!existsSync(pkgPath)) return {};
  return JSON.parse(await readFile(pkgPath, 'utf-8'));
};

/** Returns dep names that are missing from the given package.json. */
export const computeMissingDeps = (pkg: PackageJson, required: DepSet): { deps: string[]; devDeps: string[] } => {
  const allInstalled = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);
  return {
    deps: required.deps.filter((d) => !allInstalled.has(d)),
    devDeps: required.devDeps.filter((d) => !allInstalled.has(d)),
  };
};

/** Writes missing deps into a package.json (placeholder version "*", user installs after). */
export const addMissingDeps = async (
  pkgPath: string,
  missing: { deps: string[]; devDeps: string[] },
  versionMap: Record<string, string> = {},
): Promise<void> => {
  const pkg = await readPackageJson(pkgPath) as Record<string, unknown>;
  const resolve = (name: string) => versionMap[name] ?? '*';

  if (missing.deps.length) {
    pkg['dependencies'] = {
      ...(pkg['dependencies'] as Record<string, string> ?? {}),
      ...Object.fromEntries(missing.deps.map((d) => [d, resolve(d)])),
    };
  }
  if (missing.devDeps.length) {
    pkg['devDependencies'] = {
      ...(pkg['devDependencies'] as Record<string, string> ?? {}),
      ...Object.fromEntries(missing.devDeps.map((d) => [d, resolve(d)])),
    };
  }
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
};
