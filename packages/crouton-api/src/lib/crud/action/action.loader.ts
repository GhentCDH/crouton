import type { JsonAction, ResourceRowAction, ResourceTableAction } from '@ghentcdh/crouton-core';

import { findModule, importDefault } from '../loader/module.loader';
import { join } from 'node:path';

/**
 * The layout action becomes a runtime action once the loader has resolved
 * `procedure` in place; bridge the two via a (single) cast.
 */
type RuntimeAction = ResourceRowAction | ResourceTableAction;

const asRuntimeAction = (action: JsonAction): RuntimeAction => {
  const runtime: unknown = action;
  return runtime as RuntimeAction;
};

/**
 * Resolve each declared action in place.
 *
 * The action arrays passed in are the table layout node's `rowActions` /
 * `tableActions` (the single source of truth — see `getRowActions` in core),
 * so each resolved procedure is written back onto the same node instead of
 * being attached as a flat copy elsewhere.
 *
 * - `type: "link"` actions pass through as-is (no file to load).
 * - Procedure actions import their function from `{basePath}/actions/{procedure}.ts`.
 *
 * The `scope` parameter controls the procedure signature:
 * - `"row"`   → `(prisma, recordId) => Promise`
 * - `"table"` → `(prisma) => Promise`
 *
 * All metadata fields (icon, tooltip, condition) are passed through for both scopes.
 */
export const loadActions = async <S extends 'row' | 'table'>(
  jsonActions: JsonAction[],
  basePath: string,
  scope: S,
): Promise<S extends 'row' ? ResourceRowAction[] : ResourceTableAction[]> => {
  const tag = scope === 'row' ? 'actions' : 'tableActions';
  const results: RuntimeAction[] = [];

  for (const action of jsonActions) {
    if (action.type === 'link') {
      results.push(asRuntimeAction(action));
      continue;
    }

    const file = findModule(join(basePath, 'actions'), action.procedure);
    if (!file) {
      console.warn(
        `[${tag}] Procedure file not found for "${action.id}" in ${basePath}/actions/`,
      );
      continue;
    }
    const mod = await importDefault<(...args: unknown[]) => Promise<unknown>>(file);
    if (!mod) {
      console.warn(`[${tag}] No default export in ${file}`);
      continue;
    }

    // Write the loaded procedure back into the layout node in place. At
    // compile time `procedure` is the file name; from here on it is the
    // imported function the generated routes call.
    (action as { procedure: unknown }).procedure = mod;
    results.push(asRuntimeAction(action));
  }

  return results as S extends 'row'
    ? ResourceRowAction[]
    : ResourceTableAction[];
};
