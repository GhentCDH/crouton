import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Check if a path exists on disk.
 */
export const fileExists = async (p: string): Promise<boolean> => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

export interface FileEntry {
  path: string;
  contents: string;
}

/**
 * Write file only if it doesn't exist. Returns true if written.
 */
export const writeIfAbsent = async (path: string, contents: string): Promise<boolean> => {
  if (await fileExists(path)) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, 'utf-8');
  return true;
};

/**
 * Batch-write files. With `force`, overwrites existing; otherwise skips collisions.
 * Returns the number of files written.
 */
export const writeFiles = async (
  files: FileEntry[],
  opts: { force?: boolean } = {},
): Promise<number> => {
  let written = 0;
  for (const f of files) {
    if (!opts.force && (await fileExists(f.path))) continue;
    await mkdir(dirname(f.path), { recursive: true });
    await writeFile(f.path, f.contents, 'utf-8');
    written += 1;
  }
  return written;
};

/**
 * Read a template file from disk.
 */
export const loadTemplate = async (templateDir: string, relativePath: string): Promise<string> =>
  readFile(`${templateDir}/${relativePath}`, 'utf-8');
