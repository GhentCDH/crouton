import { loadConfig as loadConfigFile } from '@ghentcdh/crouton-codegen';
import { type CroutonConfig, CroutonConfigSchema } from '@ghentcdh/crouton-core';

import { isAbsolute, resolve as pathResolve } from 'node:path';

export type LoadedConfig = CroutonConfig & {
  /** Absolute directory containing the resolved crouton config file. */
  configDir: string;
};

/** Load + validate `crouton.json` (searched up from the cwd). Throws if none is found. */
export const loadConfig = async (): Promise<LoadedConfig> => {
  const { config, root: configDir } = await loadConfigFile(pathResolve(process.cwd()));
  const parsed = CroutonConfigSchema.parse(config);
  const enumsFile = isAbsolute(parsed.enumsFile)
    ? parsed.enumsFile
    : pathResolve(configDir, parsed.enumsFile);
  return { ...parsed, configDir, enumsFile };
};
