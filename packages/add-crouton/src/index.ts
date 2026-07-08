import { Command } from 'commander';

const program = new Command('add-crouton')
  .description('Add crouton to an existing project')
  .version('0.0.1')
  .option('--cwd <dir>', 'project directory (defaults to current directory)')
  .option('--backend <app>', 'backend app name (Nx) or path')
  .option('--frontend <app>', 'frontend app name (Nx) or path')
  .option('--no-frontend', 'skip frontend setup')
  .option('--pm <manager>', 'package manager (pnpm | npm | yarn | bun)')
  .option('--no-install', 'skip dependency installation')
  .option('--no-docker', 'skip Docker file generation')
  .option('-y, --yes', 'accept all defaults (non-interactive)')
  .action(() => {
    console.warn('TODO: add-crouton');
  });

program.parse();
