import { Command } from 'commander';

import { runCreate } from './runner';

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
  .option('--prefix <dir>', 'folder for crouton.json/.env/Dockerfiles, may be nested (Nx only)')
  .option('--apps-dir <dir>', 'folder holding backend + frontend (default <prefix>/apps; Nx only)')
  .option('--backend-dir <name>', 'backend folder name under the apps dir (default backend)')
  .option('--frontend-dir <name>', 'frontend folder name under the apps dir (default frontend)')
  .option('--generated-dir <dir>', 'generated types/client root (default <prefix>/generated)')
  .option('--no-docker', 'skip Docker file generation')
  .option('--no-postgres', 'skip PostgreSQL in Docker (use external DB)')
  .option('-y, --yes', 'accept all defaults (non-interactive)')
  .option('--force', 'overwrite existing files')
  .option('--db-url <url>', 'database connection URL (e.g. postgresql://user:pass@localhost:5432/db)')
  .action(async (name: string, opts) => {
    try {
      await runCreate(name, opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

program.parse();
