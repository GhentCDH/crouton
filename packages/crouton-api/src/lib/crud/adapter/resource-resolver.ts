import { type ResolveResource, readResourceJson } from '../resource/ReadResourceJson';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Outcome of resolving a relation column's `resource` path.
 *
 * The two failure modes are worth distinguishing: a path that points at nothing
 * is a typo or a moved directory, while a file that exists but does not parse is
 * a broken child config. Collapsing both into `undefined` — which is what
 * `resolveChildResource` does — leaves the caller unable to say which, and the
 * sub-resource builder then silently invents a Prisma-backed child. See
 * `buildSubResources`.
 */
export type ChildResourceResolution =
  | { ok: true; value: ResolveResource }
  | { ok: false; reason: 'missing'; attempted: string[] }
  | { ok: false; reason: 'invalid'; error: string };

/**
 * Resolve `fieldInput.resource` (e.g. `"./author.resource"`) relative to the
 * parent resource's directory, reporting *why* it failed.
 *
 * Convention: `"./author.resource"` → sibling directory `author/resource.json`.
 * A path ending in `.json` is resolved against the parent directory directly.
 */
export const resolveChildResourceDetailed = (
  resourcePath: string,
  parentDir: string,
): ChildResourceResolution => {
  const attempted: string[] = [];
  try {
    // Direct .json file reference (e.g. "./content/resource.json") — resolved
    // relative to parentDir itself.
    if (resourcePath.endsWith('.json')) {
      const directPath = resolve(parentDir, resourcePath);
      attempted.push(directPath);
      if (existsSync(directPath)) {
        const result = readResourceJson(directPath);
        if (result?.success) return { ok: true, value: result.data };
        return {
          ok: false,
          reason: 'invalid',
          error: result?.error ?? `Could not read ${directPath}`,
        };
      }
    }

    // Directory convention: "./author.resource" → sibling dir "author/resource.json"
    const childName = resourcePath
      .replace(/^\.\//, '')
      .replace(/\.resource$/, '');
    const childJsonPath = resolve(
      dirname(parentDir),
      childName,
      'resource.json',
    );
    attempted.push(childJsonPath);

    const result = readResourceJson(childJsonPath);
    if (result?.success) return { ok: true, value: result.data };
    if (result) return { ok: false, reason: 'invalid', error: result.error };

    return { ok: false, reason: 'missing', attempted };
  } catch (err) {
    return { ok: false, reason: 'invalid', error: (err as Error).message };
  }
};

/**
 * Resolve `fieldInput.resource` and return the child `resource.json` contents
 * AND the child's directory (needed so the child can resolve its own `extend`
 * paths), or `undefined` if it could not be resolved.
 *
 * Prefer {@link resolveChildResourceDetailed} where the failure reason matters.
 */
export const resolveChildResource = (
  resourcePath: string,
  parentDir: string,
): ResolveResource | undefined => {
  const resolution = resolveChildResourceDetailed(resourcePath, parentDir);
  return resolution.ok ? resolution.value : undefined;
};
