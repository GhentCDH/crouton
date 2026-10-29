import { readFile } from 'node:fs/promises';

export interface DepSet {
  deps: string[];
  devDeps: string[];
}

export const BACKEND_DEPS: DepSet = {
  deps: ['@ghentcdh/crouton-api', '@ghentcdh/crouton-core', '@prisma/adapter-pg', '@prisma/client', 'dotenv'],
  devDeps: ['@ghentcdh/crouton-cli', 'prisma', 'prisma-case-format', '@ghentcdh/crouton-prisma'],
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


