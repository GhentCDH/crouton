import { spawn } from 'node:child_process';

import type { PackageManager } from './detect';

/**
 * Run `<pm> install` in the given directory. Returns a promise that resolves
 * when the install finishes or rejects on non-zero exit.
 */
export const installDeps = (pm: PackageManager, cwd: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(pm, ['install'], { cwd, stdio: 'inherit' });
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${pm} install exited with code ${code}`)),
    );
    child.on('error', reject);
  });

/**
 * Return the prefix needed to run a package.json script:
 * `pnpm` / `npm run` / `yarn` / `bun run`.
 */
export const pmRunPrefix = (pm: PackageManager): string => {
  switch (pm) {
    case 'pnpm':
      return 'pnpm';
    case 'yarn':
      return 'yarn';
    case 'npm':
      return 'npm run';
    case 'bun':
      return 'bun run';
  }
};
