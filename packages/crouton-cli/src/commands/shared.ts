import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import pc from 'picocolors';

import { discoverProjects, findConfigPath } from '@ghentcdh/crouton-codegen';

import { assertNotCancel } from '../prompts';
import { relative, resolve } from 'node:path';

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
    .option('-p, --project <name>', 'project to use: a subfolder of cwd containing crouton.json (asked when several exist)')
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

/**
 * Resolve the project directory once per invocation:
 *  - `--project <name>` → the subfolder of cwd with that name holding a crouton config
 *  - cwd (or an ancestor) has a config → cwd (runners walk up from there)
 *  - else scan immediate subfolders: none → cwd (runner reports "no config"),
 *    one → it, several → interactive picker (`-y` → error listing candidates)
 */
export const resolveTargetProject = async (opts: CommonOptions): Promise<string> => {
  const cwd = resolve(opts.cwd ?? process.cwd());
  const candidates = () => discoverProjects(cwd);
  const list = (names: string[]) => (names.length ? names.join(', ') : '(none)');

  if (opts.project) {
    const projects = await candidates();
    const found = projects.find((p) => p.name === opts.project);
    if (!found) {
      throw new Error(
        `Unknown project "${opts.project}" under ${cwd}. Available: ${list(projects.map((p) => p.name))}.`,
      );
    }
    return found.root;
  }

  if (await findConfigPath(cwd)) return cwd;

  const projects = await candidates();
  if (projects.length === 0) return cwd;
  if (projects.length === 1) return projects[0].root;
  if (opts.yes) {
    throw new Error(
      `Multiple crouton projects under ${cwd}: ${list(projects.map((p) => p.name))}. Pick one with --project <name>.`,
    );
  }
  return assertNotCancel<string>(
    await clack.select<string>({
      message: 'Which project?',
      options: projects.map((p) => ({ value: p.root, label: p.name, hint: relative(cwd, p.configPath) })),
    }),
  );
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
  const common: CommonOptions = { ...opts, cwd: await resolveTargetProject(opts), project: undefined };
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
