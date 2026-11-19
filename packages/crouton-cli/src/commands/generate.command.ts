import type { Command } from 'commander';

import { loadConfig, loadDatasources, loadDotenv, prismaGenerate, resolveFromRoot } from '@ghentcdh/crouton-codegen';

import { type CommonOptions, resolveTargetProject, withRun } from './shared';

interface GenerateOptions extends Pick<CommonOptions, 'cwd' | 'project' | 'yes'> {
  datasource?: string;
}

/**
 * `prisma generate` (client + crouton types) for every Prisma datasource, and
 * nothing else: resources, translations and agent files are left alone, so it
 * is safe for CI and fresh checkouts (#601).
 */
const generate = async (opts: GenerateOptions): Promise<void> => {
  const loaded = await loadConfig(await resolveTargetProject(opts));
  loadDotenv(loaded.root);
  const datasources = (await loadDatasources(loaded)).filter(
    (ds) => ds.adapter !== 'custom' && (!opts.datasource || ds.name === opts.datasource),
  );
  if (!datasources.length) throw new Error(`No Prisma datasource found${opts.datasource ? ` named "${opts.datasource}"` : ''}.`);

  for (const ds of datasources) {
    const result = await prismaGenerate(loaded.root, resolveFromRoot(loaded.root, ds.prismaConfig));
    if (!result.ok) throw new Error(`prisma generate failed for "${ds.name}":\n${result.output}`);
    console.warn(`✓ generated ${ds.name}`);
  }
};

export const registerGenerateCommand = (program: Command) =>
  program
    .command('generate')
    .description('Run `prisma generate` for each datasource without touching resources (CI-safe)')
    .option('-d, --datasource <name>', 'only this datasource')
    .option('--cwd <dir>', 'project directory (defaults to the current directory)')
    .option('-p, --project <name>', 'project to use: a subfolder of cwd containing crouton.json (asked when several exist)')
    .option('-y, --yes', 'never prompt')
    .action(withRun(generate));
