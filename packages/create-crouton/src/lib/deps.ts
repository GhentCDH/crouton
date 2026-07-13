import { readFile, writeFile } from 'node:fs/promises';

export interface DepSet {
  deps: string[];
  devDeps: string[];
}

export const BACKEND_DEPS: DepSet = {
  deps: ['@ghentcdh/crouton-api', '@ghentcdh/crouton-core', '@prisma/adapter-pg', '@prisma/client', 'dotenv'],
  devDeps: ['@ghentcdh/crouton-cli', 'prisma', 'zod-prisma-types'],
};

export const FRONTEND_DEPS: DepSet = {
  deps: ['@ghentcdh/crouton-vue', '@ghentcdh/crouton-forms-vue', 'vue'],
  devDeps: ['vite', '@vitejs/plugin-vue'],
};

/**
 * Read a package.json and return dep names that are missing from it.
 */
export const computeMissing = async (
  pkgJsonPath: string,
  required: DepSet,
): Promise<DepSet> => {
  let pkg: Record<string, Record<string, string>>;
  try {
    pkg = JSON.parse(await readFile(pkgJsonPath, 'utf-8'));
  } catch {
    return required; // no package.json → everything is missing
  }
  const installed = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);
  return {
    deps: required.deps.filter((d) => !installed.has(d)),
    devDeps: required.devDeps.filter((d) => !installed.has(d)),
  };
};

/**
 * Merge deps/devDeps into an existing package.json on disk.
 */
export const addDepsToPackageJson = async (
  pkgJsonPath: string,
  deps: Record<string, string>,
  devDeps: Record<string, string>,
): Promise<void> => {
  const pkg = JSON.parse(await readFile(pkgJsonPath, 'utf-8'));
  pkg.dependencies = sortKeys({ ...(pkg.dependencies ?? {}), ...deps });
  pkg.devDependencies = sortKeys({ ...(pkg.devDependencies ?? {}), ...devDeps });
  await writeFile(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
};

const sortKeys = (obj: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
