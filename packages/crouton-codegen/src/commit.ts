/**
 * commit: the only side-effectful stage — write a `WritePlan` to disk.
 *
 * `create` actions never overwrite an existing file (so a hand-written
 * `schema.ts` is safe); `update` actions write unconditionally. `dryRun`
 * computes the result without touching disk.
 */

import { fileExists } from './util';
import type { WritePlan } from './write-plan';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';


export interface CommitOptions {
  dryRun?: boolean;
}

export interface CommitResult {
  written: string[];
  skipped: string[];
}

export const commit = async (
  plan: WritePlan,
  opts: CommitOptions = {},
): Promise<CommitResult> => {
  const written: string[] = [];
  const skipped: string[] = [];

  for (const file of plan.files) {
    if (file.action === 'create' && (await fileExists(file.path))) {
      skipped.push(file.path);
      continue;
    }
    if (!opts.dryRun) {
      await mkdir(dirname(file.path), { recursive: true });
      await writeFile(file.path, file.contents, 'utf-8');
    }
    written.push(file.path);
  }

  return { written, skipped };
};
