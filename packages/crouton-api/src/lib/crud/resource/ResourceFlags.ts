import type { RawResourceJson } from './WriteResourceJson';
import { resolve } from 'node:path';

export interface ResourceFlagPatch {
  draft?: boolean;
  sidebar?: {
    hide?: boolean;
    group?: string;
    position?: number;
    label?: string;
  };
}

/**
 * Applies flag changes to a raw resource.json object. Removes keys that are
 * at their schema default (publish = delete `draft`, un-hide = delete
 * `sidebar.hide`, empty sidebar object = delete `sidebar`) so the file stays
 * minimal.
 */
export const applyResourceFlagPatch = (
  raw: RawResourceJson,
  patch: ResourceFlagPatch,
): RawResourceJson => {
  const result = { ...raw };

  // --- draft ---
  if (patch.draft !== undefined) {
    if (patch.draft) {
      result['draft'] = true;
    } else {
      delete result['draft'];
    }
  }

  // --- sidebar ---
  if (patch.sidebar !== undefined) {
    const existing =
      raw['sidebar'] && typeof raw['sidebar'] === 'object'
        ? { ...(raw['sidebar'] as Record<string, unknown>) }
        : {};

    if (patch.sidebar.hide !== undefined) {
      if (patch.sidebar.hide) {
        existing['hide'] = true;
      } else {
        delete existing['hide'];
      }
    }
    if (patch.sidebar.group !== undefined) {
      existing['group'] = patch.sidebar.group;
    }
    if (patch.sidebar.position !== undefined) {
      existing['position'] = patch.sidebar.position;
    }
    if (patch.sidebar.label !== undefined) {
      existing['label'] = patch.sidebar.label;
    }

    // Drop sidebar key entirely when it's empty (matches schema default).
    if (Object.keys(existing).length === 0) {
      delete result['sidebar'];
    } else {
      result['sidebar'] = existing;
    }
  }

  return result;
};

/**
 * Resolves `<resourcesDir>/<name>/resource.json` with a path-traversal guard.
 * Throws if the resolved path escapes `resourcesDir`.
 */
export const resolveResourcePath = (
  resourcesDir: string,
  name: string,
): string => {
  const resolved = resolve(resourcesDir, name, 'resource.json');
  if (!resolved.startsWith(resolve(resourcesDir) + '/')) {
    throw new Error(`Invalid resource name: "${name}"`);
  }
  return resolved;
};
