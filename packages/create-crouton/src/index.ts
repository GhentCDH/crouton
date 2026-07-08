import { Command } from 'commander';

const program = new Command('create-crouton')
  .description('Scaffold a new crouton project')
  .version('0.0.1')
  .argument('[name]', 'project name', 'my-crouton-app')
  .option('--nx', 'use Nx monorepo layout')
  .option('--no-nx', 'use regular (non-Nx) layout')
  .option('--no-frontend', 'skip frontend app generation')
  .option('--sample', 'include sample resource')
  .option('--pm <manager>', 'package manager (pnpm | npm | yarn | bun)')
  .option('--no-install', 'skip dependency installation')
  .option('--no-git', 'skip git init')
  .option('--no-docker', 'skip Docker file generation')
  .option('-y, --yes', 'accept all defaults (non-interactive)')
  .option('--force', 'overwrite existing files')
  .action((name: string) => {
    console.warn(`TODO: create-crouton "${name}"`);
  });

program.parse();
