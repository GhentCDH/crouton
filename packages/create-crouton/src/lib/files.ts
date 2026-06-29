/**
 * File writing utilities for scaffold output.
 */

import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface ScaffoldFile {
  /** Root-relative path, e.g. "src/main.ts" or "apps/backend/src/main.ts" */
  path: string;
  contents: string;
}

export const fileExists = async (abs: string): Promise<boolean> => {
  try { await access(abs); return true; } catch { return false; }
};

export interface WriteResult {
  written: string[];
  skipped: string[];
}

/**
 * Write scaffold files into `root`.
 * Skips existing files unless `force` is true.
 */
export const writeScaffoldFiles = async (
  root: string,
  files: ScaffoldFile[],
  force = false,
): Promise<WriteResult> => {
  const written: string[] = [];
  const skipped: string[] = [];

  for (const f of files) {
    const abs = `${root}/${f.path}`;
    if (!force && await fileExists(abs)) {
      skipped.push(f.path);
      continue;
    }
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, f.contents, 'utf-8');
    written.push(f.path);
  }

  return { written, skipped };
};

/** Append lines to a file (creates it if missing). */
export const appendToFile = async (abs: string, lines: string[]): Promise<void> => {
  const { appendFile } = await import('node:fs/promises');
  await mkdir(dirname(abs), { recursive: true });
  await appendFile(abs, lines.join('\n') + '\n', 'utf-8');
};
