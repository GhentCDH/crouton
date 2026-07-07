import { type EnumRegistry, EnumRegistrySchema } from './enum-registry.types';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';


const ENUMS_FILE = 'crouton.enums.json';

export const loadEnumRegistry = (
  startDir: string,
  enumsFile?: string,
): EnumRegistry => {
  let file = enumsFile;
  if (!file) {
    let dir = startDir;

    while (true) {
      const candidate = join(dir, ENUMS_FILE);
      if (existsSync(candidate)) {
        file = candidate;
        break;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  if (!file || !existsSync(file)) return EnumRegistrySchema.parse(undefined);
  try {
    return EnumRegistrySchema.parse(JSON.parse(readFileSync(file, 'utf-8')));
  } catch {
    return EnumRegistrySchema.parse(undefined);
  }
};