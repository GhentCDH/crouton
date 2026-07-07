import {
  CONFIG_FILES,
  CroutonConfig,
  CroutonConfigSchema,
} from '@ghentcdh/crouton-core';
import { dirname, join, resolve as pathResolve, resolve } from 'node:path';
import { access, readFile } from 'node:fs/promises';

const fileExists = async (p: string): Promise<boolean> => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

/** Walk up from `cwd` to find `crouton.json`. */
export const findConfigPath = async (
  cwd: string,
): Promise<string | undefined> => {
  let dir = resolve(cwd);

  while (true) {
    for (const name of CONFIG_FILES) {
      const candidate = join(dir, name);
      if (await fileExists(candidate)) return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
};

/** Load + validate `crouton.json`. Throws if none is found. */
export const loadConfig = async () => {
  const cwd = pathResolve(process.cwd());
  const path = await findConfigPath(cwd);
  if (!path) {
    throw new Error(
      `No crouton config found (looked for ${CONFIG_FILES.join(', ')} up from ${cwd}).`,
    );
  }
  let config: CroutonConfig;
  if (path.endsWith('.json')) {
    config = JSON.parse(await readFile(path, 'utf-8')) as CroutonConfig;
  } else {
    const mod = (await import(path)) as {
      default?: CroutonConfig;
    } & CroutonConfig;
    config = mod.default ?? mod;
  }
  return CroutonConfigSchema.parse(config);
};
