import * as clack from '@clack/prompts';
import type { Command } from 'commander';
import pc from 'picocolors';

import { type MigrateFileOutcome, discoverResourceEntries, migrateResourceFile } from '@ghentcdh/crouton-codegen';
import { type Codemod, LAYOUT_CODEMODS, RESOURCE_CODEMODS } from '@ghentcdh/crouton-core';

import { assertNotCancel } from '../prompts';
import { type CommonOptions, registerCommonOptions, resolveTargetProject, runAggregate, withRun } from './shared';
import { existsSync } from 'node:fs';
import { relative } from 'node:path';

const describeOutcome = (o: MigrateFileOutcome, cwd: string): string => {
  const file = relative(cwd, o.file);
  if (o.status === 'current') return pc.dim(`  = ${file}`);
  if (o.status === 'failed') return pc.red(`  ✗ ${file}\n      ${o.error}`);
  return `${pc.cyan(`  ~ ${file}`)}\n${o.applied.map((a) => pc.dim(`      ${a}`)).join('\n')}`;
};

/**
 * Run a codemod chain over every resource.json of the project: preview, confirm once
 * (skipped by `-y`, or when an aggregate already asked), then write. `--dry-run` stops
 * after the preview. Files whose result does not validate are reported and left alone.
 */
const migrate = async (opts: CommonOptions, chain: Codemod[], confirmed = false): Promise<void> => {
  const cwd = await resolveTargetProject(opts);
  const files = (await discoverResourceEntries(cwd)).map((e) => e.path).filter((p) => existsSync(p));
  if (!files.length) throw new Error(`No resource.json files found under ${cwd} (is crouton.json set up?).`);

  const preview = await Promise.all(files.map((f) => migrateResourceFile(f, { chain, dryRun: true })));
  clack.log.message(preview.map((o) => describeOutcome(o, cwd)).join('\n'));

  const pending = preview.filter((o) => o.status === 'migrated');
  const failed = preview.filter((o) => o.status === 'failed');
  if (failed.length) process.exitCode = 1;
  const summary = `${pending.length} to migrate, ${preview.length - pending.length - failed.length} current, ${failed.length} failed`;

  if (!pending.length || opts.dryRun) {
    clack.log.info(opts.dryRun && pending.length ? `Dry run — ${summary}. No files written.` : summary);
    return;
  }
  if (!confirmed && !opts.yes) {
    const go = assertNotCancel(await clack.confirm({ message: `Write ${pending.length} file(s)?`, initialValue: true }));
    if (!go) {
      clack.log.warn('Aborted.');
      return;
    }
  }
  for (const o of pending) await migrateResourceFile(o.file, { chain });
  clack.log.success(`${summary}. Review the diff and commit.`);
};

export const registerMigrateCommand = (program: Command) => {
  const migrateCmd = registerCommonOptions(
    program
      .command('migrate')
      .description('Migrate everything: resources, then layout (or pick a noun below)'),
  ).action(
    withRun((opts: CommonOptions) =>
      runAggregate('crouton migrate', opts, [
        { name: 'migrate resources', run: (common) => migrate(common, RESOURCE_CODEMODS, true) },
        // ponytail: layout ⊂ resources, so this pass is a no-op after the first; kept so the aggregate runs every noun.
        { name: 'migrate layout', run: (common) => migrate(common, LAYOUT_CODEMODS, true) },
      ]),
    ),
  );

  registerCommonOptions(
    migrateCmd
      .command('resources')
      .description('Rewrite resource.json files to the current schema (every rule in migrate-to-next-alpha.md)'),
  ).action(withRun((opts: CommonOptions) => migrate(opts, RESOURCE_CODEMODS)));

  registerCommonOptions(
    migrateCmd
      .command('layout')
      .description('Rewrite only layout nodes (controls → items, actions → rowActions, table search/filter fields)'),
  ).action(withRun((opts: CommonOptions) => migrate(opts, LAYOUT_CODEMODS)));
};
