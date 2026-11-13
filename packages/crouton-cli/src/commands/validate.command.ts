import type { Command } from 'commander';

import { type ValidationIssue, discoverResourceEntries, validateResourceFile } from '@ghentcdh/crouton-codegen';

import { type CommonOptions, registerCommonOptions, resolveTargetProject, withRun } from './shared';
import { resolve } from 'node:path';

interface ValidateOptions { json?: boolean; cwd?: string; project?: string }

const discoverResourceFiles = async (cwd: string): Promise<string[]> =>
  (await discoverResourceEntries(cwd)).map((entry) => entry.path);

const validateResources = async (paths: string[], opts: ValidateOptions): Promise<void> => {
  const cwd = resolveTargetProject(opts);

  let files: string[];
  if (paths.length > 0) {
    files = paths.map((p) => resolve(p));
  } else {
    files = await discoverResourceFiles(cwd);
    if (files.length === 0) {
      const msg = 'No resource.json files found. Pass paths or set up crouton.json.';
      if (opts.json) {
        process.stdout.write(JSON.stringify({ ok: false, issues: [{ file: '', path: '', code: 'NO_FILES', message: msg }] }) + '\n');
      } else {
        console.error(msg);
      }
      process.exitCode = 1;
      return;
    }
  }

  const allIssues: ValidationIssue[] = [];
  for (const file of files) {
    const issues = await validateResourceFile(file);
    allIssues.push(...issues);
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ok: allIssues.length === 0, issues: allIssues }) + '\n');
  } else {
    for (const issue of allIssues) {
      const hint = issue.hint ? ` ${issue.hint}` : '';
      const docs = issue.docs ? ` (${issue.docs})` : '';
      console.error(`${issue.file} ${issue.path}: ${issue.message}.${hint}${docs}`);
    }
    const total = files.length;
    const errorCount = allIssues.length;
    process.stderr.write(`${total} file(s) checked, ${errorCount} issue(s) found.\n`);
  }

  if (allIssues.length > 0) process.exitCode = 1;
};

export const registerValidateCommand = (program: Command) => {
  const validate = registerCommonOptions(
    program
      .command('validate')
      .description('Validate everything: resource.json files (or pick a noun below)'),
  ).action(withRun((opts: CommonOptions) => validateResources([], opts)));

  validate
    .command('resources')
    .description('Validate resource.json files')
    .argument('[paths...]', 'files or directories to validate (default: discover via crouton.json)')
    .option('--json', 'output results as JSON')
    .option('--cwd <dir>', 'project directory (defaults to the current directory)')
    .option('-p, --project <name>', 'project subfolder (resolves cwd to <cwd>/<project>)')
    .action(withRun(validateResources));
};
