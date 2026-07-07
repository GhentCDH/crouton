import type { JsonAction } from '../loader/json-config.types';
import type { ResourceRowAction, ResourceTableAction } from './action.types';
import { findModule, importDefault } from '../loader/module.loader';
import { join } from 'node:path';

/**
 * Resolve each declared action into a runtime action object.
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
  const results: (ResourceRowAction | ResourceTableAction)[] = [];

  for (const action of jsonActions) {
    if (action.type === 'link') {
      results.push({
        type: 'link',
        id: action.id,
        label: action.label,
        href: action.href,
        ...(action.icon && { icon: action.icon }),
        ...(action.tooltip && { tooltip: action.tooltip }),
        ...(action.condition && { condition: action.condition }),
      });
      continue;
    }

    const file = findModule(join(basePath, 'actions'), action.procedure);
    if (!file) {
      console.warn(
        `[${tag}] Procedure file not found for "${action.id}" in ${basePath}/actions/`,
      );
      continue;
    }
    const mod = await importDefault<(...args: any[]) => Promise<any>>(file);
    if (!mod) {
      console.warn(`[${tag}] No default export in ${file}`);
      continue;
    }

    results.push({
      id: action.id,
      label: action.label,
      method: action.method,
      data: action.data,
      ...(action.icon && { icon: action.icon }),
      ...(action.tooltip && { tooltip: action.tooltip }),
      ...(action.condition && { condition: action.condition }),
      procedure: mod,
    } as ResourceRowAction | ResourceTableAction);
  }

  return results as any;
};