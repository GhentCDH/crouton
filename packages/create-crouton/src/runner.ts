/**
 * Main orchestrator for `create-crouton`.
 * Prompts → build token map → scaffold → post-scaffold.
 */

import * as clack from '@clack/prompts';
import pc from 'picocolors';


import { detectPm } from './lib/detect.js';
import { writeScaffoldFiles } from './lib/files.js';
import { gitInit, installDeps, printNextSteps, prismaGenerate } from './lib/postscaffold.js';
import { isValidSlug, pmRunPrefix, toPascalCase } from './lib/render.js';
import type { Tokens } from './lib/render.js';
import { buildDockerFiles } from './templates/docker.js';
import { buildNxFiles } from './templates/nx.js';
import { buildRegularFiles } from './templates/regular.js';
import { existsSync } from 'node:fs';
import { join, resolve as pathResolve } from 'node:path';

export interface CreateOptions {
  name?: string;
  nx?: boolean;
  noNx?: boolean;
  pm?: string;
  noFrontend?: boolean;
  sample?: boolean;
  noInstall?: boolean;
  noGit?: boolean;
  noDocker?: boolean;
  yes?: boolean;
  force?: boolean;
  backendAppName?: string;
  frontendAppName?: string;
  cwd?: string;
}

const assertNotCancel = <T>(v: T | symbol): T => {
  if (clack.isCancel(v)) throw new Error('__cancelled__');
  return v as T;
};

export const runCreate = async (opts: CreateOptions): Promise<void> => {
  clack.intro(pc.bold(pc.cyan('create-crouton')));

  try {
    const baseCwd = pathResolve(opts.cwd ?? process.cwd());

    // ── 1. Project name ──────────────────────────────────────────────────────
    const name: string = opts.name
      ? opts.name
      : opts.yes
        ? 'my-crouton-app'
        : assertNotCancel(
            await clack.text({
              message: 'Project name',
              placeholder: 'my-crouton-app',
              validate: (v: string) => {
                if (!v.trim()) return 'Name is required';
                if (!isValidSlug(v.trim())) return 'Use lowercase letters, digits, - or _';
                const dir = join(baseCwd, v.trim());
                if (existsSync(dir) && !opts.force) return `Directory "${v.trim()}" already exists (use --force to overwrite)`;
                return undefined;
              },
            }),
          ) as string;

    const targetDir = join(baseCwd, name);

    // ── 2. Layout ────────────────────────────────────────────────────────────
    let isNx: boolean;
    if (opts.nx) {
      isNx = true;
    } else if (opts.noNx) {
      isNx = false;
    } else if (opts.yes) {
      isNx = false;
    } else {
      isNx = assertNotCancel(
        await clack.select({
          message: 'Project layout',
          options: [
            { value: false, label: 'Regular', hint: 'single package — simplest' },
            { value: true, label: 'Nx monorepo', hint: 'apps/backend + apps/frontend + generated types' },
          ],
        }),
      ) as boolean;
    }

    // ── 3. Nx app names ──────────────────────────────────────────────────────
    let backendAppName = opts.backendAppName ?? 'backend';
    let frontendAppName = opts.frontendAppName ?? 'frontend';
    if (isNx && !opts.yes) {
      backendAppName = assertNotCancel(
        await clack.text({ message: 'Backend app name', initialValue: 'backend' }),
      ) as string;
      frontendAppName = assertNotCancel(
        await clack.text({ message: 'Frontend app name', initialValue: 'frontend' }),
      ) as string;
    }

    // ── 4. Frontend ──────────────────────────────────────────────────────────
    const includeFrontend: boolean = opts.noFrontend
      ? false
      : opts.yes
        ? true
        : assertNotCancel(
            await clack.confirm({ message: 'Include frontend (Vue + crouton-vue)?', initialValue: true }),
          ) as boolean;

    // ── 5. Package manager ───────────────────────────────────────────────────
    const pm: string = opts.pm
      ? opts.pm
      : opts.yes
        ? detectPm(baseCwd)
        : assertNotCancel(
            await clack.select({
              message: 'Package manager',
              options: [
                { value: 'pnpm', label: 'pnpm', hint: 'recommended' },
                { value: 'npm', label: 'npm' },
                { value: 'yarn', label: 'yarn' },
                { value: 'bun', label: 'bun' },
              ],
              initialValue: detectPm(baseCwd),
            }),
          ) as string;

    // ── 6. Sample content ────────────────────────────────────────────────────
    const sample: boolean = opts.sample !== undefined
      ? opts.sample
      : opts.yes
        ? false
        : assertNotCancel(
            await clack.confirm({ message: 'Include a sample Note model?', initialValue: false }),
          ) as boolean;

    // ── Build token map ──────────────────────────────────────────────────────
    const tokens: Tokens = {
      name,
      Name: toPascalCase(name),
      pm,
      pmRun: pmRunPrefix(pm),
      year: new Date().getFullYear().toString(),
      backendPort: '3000',
      frontendPort: '4200',
      dbName: name.replace(/[^a-z0-9]/gi, '_').toLowerCase(),
      urlEnv: 'DATABASE_URL',
      backendAppName,
      frontendAppName,
      generatedPackage: isNx ? `@${name}/generated-types` : `${name}/generated`,
      version: '*',
    };

    // ── 7. Scaffold files ────────────────────────────────────────────────────
    const s = clack.spinner();
    s.start('Scaffolding files…');

    const layoutFiles = isNx
      ? buildNxFiles(tokens, { includeFrontend, sample })
      : buildRegularFiles(tokens, { includeFrontend, sample });

    const dockerFiles = buildDockerFiles(tokens, { isNx, includeFrontend });
    const allFiles = [...layoutFiles, ...dockerFiles];

    const { written, skipped } = await writeScaffoldFiles(targetDir, allFiles, opts.force ?? false);
    s.stop(`Wrote ${written.length} files${skipped.length ? `, skipped ${skipped.length} existing` : ''}.`);

    if (skipped.length) {
      clack.log.warn(`Skipped (already exist):\n${skipped.map((f) => `  ${f}`).join('\n')}`);
    }

    // ── 8. Install deps ──────────────────────────────────────────────────────
    const doInstall: boolean = opts.noInstall
      ? false
      : opts.yes
        ? true
        : assertNotCancel(
            await clack.confirm({ message: `Install dependencies with ${pm}?`, initialValue: true }),
          ) as boolean;

    if (!opts.noGit) gitInit(targetDir);
    if (doInstall) {
      installDeps(targetDir, pm);
      prismaGenerate(targetDir, pm);
    }

    // ── 9. Configure datasource ──────────────────────────────────────────────
    const doDatasource: boolean = opts.yes
      ? false
      : assertNotCancel(
          await clack.confirm({ message: 'Configure a datasource now?', initialValue: false }),
        ) as boolean;

    if (doDatasource) {
      clack.log.step('Running datasource wizard…');
      // Invoke the installed crouton-cli so the wizard runs in the new project context.
      const { execSync: exec } = await import('node:child_process');
      try {
        exec(`${pm === 'pnpm' ? 'pnpx' : 'npx'} crouton create-datasource`, {
          cwd: targetDir,
          stdio: 'inherit',
        });
      } catch {
        clack.log.warn('Could not run crouton create-datasource — run it manually after install.');
      }
    }

    // ── 10. Next steps ───────────────────────────────────────────────────────
    printNextSteps(targetDir, pm, name, true);
    clack.outro(pc.green(`✔ ${name} created successfully!`));

  } catch (err) {
    if (err instanceof Error && err.message === '__cancelled__') {
      clack.cancel('Cancelled.');
      return;
    }
    throw err;
  }
};
