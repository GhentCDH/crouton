/**
 * Post-scaffold steps: git init, install deps, prisma generate.
 */

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { execSync } from 'node:child_process';

export const tryRun = (cmd: string, cwd: string, label: string): boolean => {
  try {
    execSync(cmd, { cwd, stdio: 'pipe' });
    return true;
  } catch {
    clack.log.warn(`${label} failed — run it manually.`);
    return false;
  }
};

export const gitInit = (cwd: string): void => {
  if (tryRun('git init', cwd, 'git init')) {
    tryRun('git add -A', cwd, 'git add');
    tryRun('git commit -m "chore: initial crouton scaffold"', cwd, 'git commit');
    clack.log.success('Git repository initialised.');
  }
};

export const installDeps = (cwd: string, pm: string): void => {
  const s = clack.spinner();
  s.start(`Installing dependencies with ${pm}…`);
  const ok = tryRun(`${pm} install`, cwd, `${pm} install`);
  if (ok) s.stop('Dependencies installed.');
  else s.stop(pc.yellow('Install failed — run manually.'));
};

export const prismaGenerate = (cwd: string, pm: string): void => {
  const s = clack.spinner();
  s.start('Running prisma generate…');
  const pmx = pm === 'npm' ? 'npx' : pm === 'pnpm' ? 'pnpx' : pm;
  const ok = tryRun(`${pmx} prisma generate`, cwd, 'prisma generate');
  if (ok) s.stop('Prisma client generated.');
  else s.stop(pc.yellow('prisma generate failed — run after install.'));
};

export const printNextSteps = (
  cwd: string,
  pm: string,
  name: string,
  fromParent: boolean,
): void => {
  const run = pm === 'npm' ? 'npm run' : pm;
  const rel = fromParent ? `cd ${name} && ` : '';
  clack.log.message(
    [
      pc.bold('Next steps:'),
      `  ${pc.cyan(`${rel}docker compose -f docker/compose.yml up -d db`)}   # start Postgres`,
      `  ${pc.cyan(`${rel}${pm} prisma migrate dev --name init`)}            # create first migration`,
      `  ${pc.cyan(`${rel}${pm} crouton update resources`)}                  # generate resource configs`,
      `  ${pc.cyan(`${rel}${run} dev`)}                                      # start dev server`,
      '',
      pc.dim('⚠  @ghentcdh/* packages must be published to npm for install to succeed.'),
    ].join('\n'),
  );
};
