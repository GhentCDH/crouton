import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import pc from 'picocolors';

import { assertNotCancel } from '../prompts';
import { resolve } from 'node:path';

/** Options every cwd-touching command accepts. */
export interface CommonOptions {
  cwd?: string;
  project?: string;
  dryRun?: boolean;
  yes?: boolean;
}

/** Register `--cwd`, `-p/--project`, `--dry-run`, `-y/--yes` on a command. */
export const registerCommonOptions = (cmd: Command): Command =>
  cmd
    .option('--cwd <dir>', 'project directory (defaults to the current directory)')
    .option('-p, --project <name>', 'project subfolder (resolves cwd to <cwd>/<project>)')
    .option('--dry-run', 'show the planned changes without writing files')
    .option('-y, --yes', 'accept all recommended defaults (non-interactive)');

/** Wrap a command action with the shared error handling (message to stderr, exit code 1). */
export const withRun =
  <A extends unknown[]>(fn: (...args: A) => Promise<void>) =>
  async (...args: A): Promise<void> => {
    try {
      await fn(...args);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  };

/** Resolve the project directory from `--cwd` and `--project`. */
// ponytail: --project is a plain subfolder for now; discovery + picker land in the project-picker PR.
export const resolveTargetProject = (opts: CommonOptions): string => {
  const cwd = resolve(opts.cwd ?? process.cwd());
  return opts.project ? resolve(cwd, opts.project) : cwd;
};

/**
 * Run a bare group verb as an aggregate: show the ordered steps, ask once
 * (skipped by `-y` / `--dry-run`), then run each step against the resolved project.
 * Stops at the first failing step.
 */
export const runAggregate = async (
  title: string,
  opts: CommonOptions,
  steps: { name: string; run: (common: CommonOptions) => Promise<void> }[],
): Promise<void> => {
  const common: CommonOptions = { ...opts, cwd: resolveTargetProject(opts), project: undefined };
  clack.log.step(`${pc.bold(title)} runs: ${steps.map((s) => s.name).join(' → ')}`);
  if (!opts.yes && !opts.dryRun) {
    const go = assertNotCancel(await clack.confirm({ message: 'Continue?', initialValue: true }));
    if (!go) {
      clack.log.warn('Aborted.');
      return;
    }
  }
  for (const step of steps) {
    await step.run(common);
    if (process.exitCode) return;
  }
};
