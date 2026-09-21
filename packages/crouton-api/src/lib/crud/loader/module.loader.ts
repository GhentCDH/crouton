import { IS_DEV } from '../dev-mode';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// createRequire works in both CJS and ESM contexts, unlike bare `require`.
// In CJS contexts (nodemon + @swc-node/register), import.meta.url is undefined,
// so fall back to __filename which is always available in CJS.
const _require = createRequire(import.meta.url ?? __filename);

// True when running under an ESM loader that handles .ts files (e.g. tsx/esm via
// `node --import tsx/esm`). In this context require() does NOT handle .ts files —
// only import() does. In a plain CJS context (import.meta.url undefined),
// require() is patched by @swc-node/register and is the correct choice.
const IS_ESM = typeof import.meta !== 'undefined' && typeof import.meta.url === 'string';

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

/**
 * Dynamically import a default export, returning `undefined` on failure.
 *
 * Failures are reported through `onError` when supplied, and logged otherwise.
 * Without that, a broken user file (syntax error, bad import) is
 * indistinguishable from a missing one — which made `hooks.ts` fail silently.
 */
export const importDefault = async <T>(
  filePath: string,
  onError?: (error: unknown, filePath: string) => void,
): Promise<T | undefined> => {
  try {
    if (IS_VITE) {
      // In Vite dev mode, bust the module cache so edits are picked up without
      // a full server restart. The ?t= trick only works inside Vite's resolver.
      const importPath = IS_DEV ? `${filePath}?t=${Date.now()}` : filePath;
      const mod = await import(importPath);
      return (mod.default ?? mod) as T;
    } else if (IS_ESM) {
      // ESM mode (node --import tsx/esm): require() does not handle .ts files.
      // Use import() with a file:// URL so the tsx ESM loader intercepts it.
      // nodemon restarts the whole process on file changes, no cache-busting needed.
      const mod = await import(pathToFileURL(filePath).href);
      return (mod.default ?? mod) as T;
    } else {
      // CJS mode (nodemon + @swc-node/register): require() is patched to handle .ts.
      const mod = _require(filePath) as { default?: T };
      return mod.default;
    }
  } catch (error) {
    if (onError) onError(error, filePath);
    else console.error(`[crouton] Failed to import ${filePath}:`, error);
    return undefined;
  }
};
