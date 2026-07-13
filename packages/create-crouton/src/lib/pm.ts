import type { PackageManager } from './detect';
import { execSync, spawn } from 'node:child_process';

const MIN_PNPM_MAJOR = 11;

/**
 * Check that the installed pnpm version meets the minimum requirement.
 * Returns the detected version string, or throws with an actionable message.
 */
export const checkPnpmVersion = (): string => {
  let raw: string;
  try {
    raw = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
  } catch {
    throw new Error('pnpm is not installed. Install it with: npm i -g pnpm@latest');
  }
  const major = parseInt(raw.split('.')[0], 10);
  if (isNaN(major) || major < MIN_PNPM_MAJOR) {
    throw new Error(
      `pnpm ${raw} detected, but version ${MIN_PNPM_MAJOR}+ is required.\n` +
        `Upgrade with: npm i -g pnpm@latest`,
    );
  }
  return raw;
};

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
