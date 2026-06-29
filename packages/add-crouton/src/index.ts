import { Command } from 'commander';

import { runAdd } from './runner.js';

new Command('add-crouton')
  .description('Add crouton to an existing project (Nx or regular)')
  .version('0.0.1-alpha.1')
  .option('--cwd <dir>', 'project root (defaults to current directory)')
  .option('--backend <path>', '[Nx] relative path to backend app')
  .option('--frontend <path>', '[Nx] relative path to frontend app (or "none")')
  .option('--no-frontend', 'skip frontend wiring')
  .option('--pm <pm>', 'package manager (npm|pnpm|yarn|bun)')
  .option('--no-install', 'skip dependency install')
  .option('--no-docker', 'skip Docker file generation')
  .option('-y, --yes', 'accept all defaults (non-interactive / CI)')
  .action(async (opts: Record<string, unknown>) => {
    try {
      await runAdd({
        cwd: opts.cwd as string | undefined,
        backend: opts.backend as string | undefined,
        frontend: opts.frontend as string | undefined,
        noFrontend: !opts.frontend,
        pm: opts.pm as string | undefined,
        noInstall: !opts.install,
        noDocker: !opts.docker,
        yes: opts.yes as boolean | undefined,
      });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  })
  .parse();
