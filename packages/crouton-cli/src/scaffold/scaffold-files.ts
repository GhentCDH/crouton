/**
 * Shared I/O for the `create-*` scaffold commands: preview the planned file
 * set, ask for confirmation, and write only files that do not exist yet.
 *
 * `create-datasource` and `create-resource` had identical copies of this.
 */

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { resolveFromRoot } from '@ghentcdh/crouton-codegen';

import { CancelledError } from '../update/resolver';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const assertNotCancel = <T>(value: T | symbol): T => {
  if (clack.isCancel(value)) throw new CancelledError();
  return value as T;
};

export const fileExists = async (p: string): Promise<boolean> => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

export interface ScaffoldFile {
  path: string;
  contents: string;
}

export interface WriteScaffoldOptions {
  /** Absolute project root. */
  root: string;
  /** Heading shown above the file list. */
  title: string;
  files: ScaffoldFile[];
  notes: string[];
  dryRun?: boolean;
  yes?: boolean;
  /** Noun used in the final “<label> scaffolded.” message. */
  doneLabel: string;
}

/**
 * Show the planned files (highlighting collisions), confirm when interactive,
 * then write every non-colliding file. Existing files are never overwritten.
 */
export const writeScaffoldFiles = async ({
  root,
  title,
  files,
  notes,
  dryRun,
  yes,
  doneLabel,
}: WriteScaffoldOptions): Promise<void> => {
  const collisions: string[] = [];
  for (const f of files) {
    if (await fileExists(resolveFromRoot(root, f.path))) collisions.push(f.path);
  }

  clack.log.message(
    [
      pc.bold(title),
      ...files.map(
        (f) =>
          `${collisions.includes(f.path) ? pc.yellow('! ') : pc.green('+ ')}${f.path}`,
      ),
    ].join('\n'),
  );
  if (collisions.length) {
    clack.log.warn(
      `Existing files will NOT be overwritten: ${collisions.join(', ')}`,
    );
  }

  if (dryRun) {
    clack.outro(pc.yellow('Dry run — no files written.'));
    return;
  }

  const go = yes
    ? true
    : (assertNotCancel(
        await clack.confirm({
          message: `Write ${files.length - collisions.length} file(s)?`,
          initialValue: true,
        }),
      ) as boolean);
  if (!go) throw new CancelledError();

  let written = 0;
  for (const f of files) {
    const abs = resolveFromRoot(root, f.path);
    if (await fileExists(abs)) continue; // never clobber
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, f.contents, 'utf-8');
    written += 1;
  }

  clack.log.success(`Wrote ${written} file(s).`);
  clack.log.message(
    [pc.bold('Next steps:'), ...notes.map((n) => `  • ${n}`)].join('\n'),
  );
  clack.outro(pc.green(`${doneLabel} scaffolded.`));
};
