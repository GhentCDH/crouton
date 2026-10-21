import type { Command } from 'commander';

import {
  loadConfig,
  syncAgentFiles,
} from '@ghentcdh/crouton-codegen';

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const agentFilesDir = fileURLToPath(new URL('../agent-files', import.meta.url));

export const registerMigrateCommand = (program: Command) => {
  program
    .command('migrate')
    .description('Sync agent files (Claude skill / Cursor rule / AGENTS.md) to the current crouton version. For resource.json migrations use migrate-to-next-alpha.md with an AI assistant.')
    .option('--check', 'exit 1 if any agent file needs updating (CI-friendly)')
    .option('--targets <list>', 'comma-separated agent targets to sync: claude,cursor (default: both)', 'claude,cursor')
    .option('--force', 'overwrite edited agent files without prompting')
    .option('--dry-run', 'print what would change without writing')
    .option('--cwd <dir>', 'project directory', process.cwd())
    .action(async (
      opts: {
        check?: boolean;
        targets: string;
        force?: boolean;
        dryRun?: boolean;
        cwd: string;
      },
    ) => {
      const cwd = resolve(opts.cwd);
      const targets = opts.targets.split(',').map((s) => s.trim()).filter((s): s is 'claude' | 'cursor' =>
        s === 'claude' || s === 'cursor',
      );

      let loaded: Awaited<ReturnType<typeof loadConfig>> | undefined;
      try {
        loaded = await loadConfig(cwd);
      } catch {
        console.error('No crouton.json found — cannot sync agent files.');
        process.exitCode = 1;
        return;
      }

      let version = '0.0.1-alpha.82';
      try {
        const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf-8')) as { version: string };
        version = pkg.version;
      } catch { /* use default */ }

      const context = {
        resourcesDir: loaded.config.resourcesDir,
        dataSourcesDir: loaded.config.dataSourcesDir,
        version,
      };

      if (opts.check) {
        const results = await syncAgentFiles({ projectDir: cwd, agentFilesDir, context, targets, dryRun: true });
        const needsUpdate = results.filter((r) => r.action === 'written');
        if (needsUpdate.length > 0) {
          for (const r of needsUpdate) console.error(`agent files: ${r.path} needs update`);
          process.exitCode = 1;
        }
        return;
      }

      const results = await syncAgentFiles({
        projectDir: cwd,
        agentFilesDir,
        context,
        targets,
        force: opts.force,
        dryRun: opts.dryRun,
      });

      for (const r of results) {
        if (r.action === 'written') console.warn(`agent files  ${r.path}  updated`);
        else if (r.action === 'skipped') console.warn(`agent files  ${r.path}  skipped (${r.reason})`);
      }
    });
};
