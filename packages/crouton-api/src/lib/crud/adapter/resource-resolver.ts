import { type ResolveResource, readResourceJson } from '../resource/ReadResourceJson';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';


/**
 * Resolve `fieldInput.resource` (e.g. `"./author.resource"`) relative to the
 * parent resource's directory and return the child `resource.json` contents
 * AND the child's directory (needed so the child can resolve its own `extend` paths).
 *
 * Convention: `"./author.resource"` → sibling directory `author/resource.json`.
 */
export const resolveChildResource = (
  resourcePath: string,
  parentDir: string,
): ResolveResource | undefined => {
  // Direct .json file reference (e.g. "./resource.content.json") — resolve relative to parentDir itself
  const directPath = resolve(parentDir, resourcePath);
  try {
    if (resourcePath.endsWith('.json') && existsSync(directPath)) {
      return readResourceJson(directPath);
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

    return readResourceJson(childJsonPath);
  } catch {
    return undefined;
  }
};