import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { IS_DEV } from '../dev-mode';

/** Find a module file by trying `.ts` then `.js` extensions. */
export const findModule = (dir: string, name: string): string | undefined => {
  for (const ext of ['.ts', '.js']) {
    const p = join(dir, `${name}${ext}`);
    if (existsSync(p)) return p;
  }
  return undefined;
};

/**
 * `true` when running inside Vite's module graph (dev server or SSR build).
 * The `?t=` cache-busting trick only works in Vite; in plain Node.js it
 * causes `import()` to throw because query strings aren't valid on file paths.
 */
const IS_VITE = typeof (globalThis as any).__vite_ssr_import__ === 'function';

/** Dynamically import a default export, returning `undefined` on failure. */
export const importDefault = async <T>(filePath: string): Promise<T | undefined> => {
  try {
    // Bust Vite's module cache so edits to schema.ts are picked up without a
    // full server restart. In plain Node (nodemon) the process restarts on
    // file changes, so cache-busting is unnecessary — and the query string
    // would cause Node's import() to fail with "Cannot find module".
    const importPath = (IS_DEV && IS_VITE) ? `${filePath}?t=${Date.now()}` : filePath;
    const mod = await import(importPath);
    return mod.default as T;
  } catch {
    return undefined;
  }
};
