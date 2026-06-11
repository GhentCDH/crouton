import { IS_DEV } from '../dev-mode';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

// createRequire works in both CJS and ESM contexts, unlike bare `require`.
const _require = createRequire(import.meta.url);

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
    if (IS_VITE) {
      // In Vite dev mode, bust the module cache so edits are picked up without
      // a full server restart. The ?t= trick only works inside Vite's resolver.
      const importPath = IS_DEV ? `${filePath}?t=${Date.now()}` : filePath;
      const mod = await import(importPath);
      return (mod.default ?? mod) as T;
    } else {
      // In CJS mode (nodemon + @swc-node/register), native import() goes
      // through Node's ESM loader which rejects .ts files. require() is
      // intercepted by @swc-node/register and handles .ts source correctly.
      // nodemon restarts the whole process on file changes, so no cache-busting
      // is needed here.
       
      const mod = _require(filePath) as { default?: T };
      return mod.default;
    }
  } catch {
    return undefined;
  }
};
