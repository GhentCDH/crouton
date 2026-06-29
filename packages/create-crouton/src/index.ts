import { Command } from 'commander';

import { runCreate } from './runner.js';

new Command('create-crouton')
  .description('Scaffold a new crouton app from scratch')
  .version('0.0.1-alpha.1')
  .argument('[name]', 'project name (slug)')
  .option('--nx', 'use Nx monorepo layout')
  .option('--no-nx', 'use regular single-package layout')
  .option('--backend-app-name <name>', 'backend app name (Nx only)', 'backend')
  .option('--frontend-app-name <name>', 'frontend app name (Nx only)', 'frontend')
  .option('--no-frontend', 'skip frontend scaffolding')
  .option('--sample', 'include a sample Note model')
  .option('--pm <pm>', 'package manager (npm|pnpm|yarn|bun)')
  .option('--no-install', 'skip dependency install')
  .option('--no-git', 'skip git init')
  .option('--no-docker', 'skip Docker file generation')
  .option('-y, --yes', 'accept all defaults (non-interactive / CI)')
  .option('--force', 'write into a non-empty directory')
  .option('--cwd <dir>', 'parent directory for the new project')
  .action(async (name: string | undefined, opts: Record<string, unknown>) => {
    try {
      await runCreate({
        name,
        nx: opts.nx as boolean | undefined,
        noNx: !opts.nx && opts.nx !== undefined ? true : undefined,
        pm: opts.pm as string | undefined,
        noFrontend: !opts.frontend,
        sample: opts.sample as boolean | undefined,
        noInstall: !opts.install,
        noGit: !opts.git,
        noDocker: !opts.docker,
        yes: opts.yes as boolean | undefined,
        force: opts.force as boolean | undefined,
        backendAppName: opts.backendAppName as string | undefined,
        frontendAppName: opts.frontendAppName as string | undefined,
        cwd: opts.cwd as string | undefined,
      });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  })
  .parse();
