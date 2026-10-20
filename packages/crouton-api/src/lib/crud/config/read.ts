import {
  CONFIG_FILES,
  type CroutonConfig,
  CroutonConfigSchema,
} from '@ghentcdh/crouton-core';

import { findConfigPath } from '@ghentcdh/crouton-codegen';

import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve as pathResolve } from 'node:path';

export { findConfigPath } from '@ghentcdh/crouton-codegen';

export type LoadedConfig = CroutonConfig & {
  /** Absolute directory containing the resolved crouton config file. */
  configDir: string;
};

/** Load + validate `crouton.json`. Throws if none is found. */
export const loadConfig = async (): Promise<LoadedConfig> => {
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

  const parsed = CroutonConfigSchema.parse(config);
  const configDir = dirname(path);
  const enumsFile = isAbsolute(parsed.enumsFile)
    ? parsed.enumsFile
    : pathResolve(configDir, parsed.enumsFile);
  return { ...parsed, configDir, enumsFile };
};
