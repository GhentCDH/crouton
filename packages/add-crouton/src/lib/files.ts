/**
 * File writing helpers for add-crouton (additive-only).
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const fileExists = async (abs: string): Promise<boolean> => {
  try { await access(abs); return true; } catch { return false; }
};

export interface AddFile {
  path: string;       // root-relative
  contents: string;
  overwrite?: boolean; // default false
}

export interface AddResult {
  written: string[];
  skipped: string[];
}

export const writeAddFiles = async (root: string, files: AddFile[]): Promise<AddResult> => {
  const written: string[] = [];
  const skipped: string[] = [];

  for (const f of files) {
    const abs = `${root}/${f.path}`;
    if (!f.overwrite && await fileExists(abs)) {
      skipped.push(f.path);
      continue;
    }
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, f.contents, 'utf-8');
    written.push(f.path);
  }

  return { written, skipped };
};

export const readJsonFile = async <T>(abs: string): Promise<T | null> => {
  try { return JSON.parse(await readFile(abs, 'utf-8')) as T; } catch { return null; }
};
