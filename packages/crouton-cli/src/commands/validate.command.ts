import type { Command } from 'commander';

import { type ValidationIssue, findConfigPath, loadConfig, resolveFromRoot, validateResourceFile } from '@ghentcdh/crouton-codegen';

import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';



const discoverResourceFiles = async (cwd: string): Promise<string[]> => {
  const configPath = await findConfigPath(cwd);
  if (!configPath) return [];
  const loaded = await loadConfig(cwd);
  const base = resolveFromRoot(loaded.root, loaded.config.resourcesDir);
  let entries: { isDirectory(): boolean; name: string }[];
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    files.push(join(base, e.name, 'resource.json'));
  }
  return files;
};

export const registerValidateCommand = (program: Command) => {
  program
    .command('validate')
    .description('Validate resource.json files')
    .argument('[paths...]', 'files or directories to validate (default: discover via crouton.json)')
    .option('--json', 'output results as JSON')
    .option('--strict', 'enable strict checks')
    .option('--cwd <dir>', 'project directory', process.cwd())
    .action(async (paths: string[], opts: { json?: boolean; strict?: boolean; cwd: string }) => {
      const cwd = resolve(opts.cwd);

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
        const issues = await validateResourceFile(file, { strict: opts.strict });
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
    });
};
