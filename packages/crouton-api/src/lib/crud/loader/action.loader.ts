import type { JsonAction, JsonTableAction } from './json-config.types';
import type { ResourceAction, ResourceTableAction } from '../crud.config';
import { findModule, importDefault } from './module.loader';
import { join } from 'node:path';

/**
 * Resolve each declared action into a `ResourceAction`:
 * - `type: "link"` actions pass through as-is (no file to load).
 * - Procedure actions import their function from `{basePath}/actions/{procedure}.ts`.
 */
export const loadActions = async (
  jsonActions: JsonAction[],
  basePath: string,
): Promise<ResourceAction[]> => {
  const results: ResourceAction[] = [];
  for (const action of jsonActions) {
    if (action.type === 'link') {
      results.push({ type: 'link', id: action.id, label: action.label, href: action.href, ...(action.condition && { condition: action.condition }) });
      continue;
    }

    const file = findModule(join(basePath, 'actions'), action.procedure);
    if (!file) {
      console.warn(`[actions] Procedure file not found for "${action.id}" in ${basePath}/actions/`);
      continue;
    }
    const mod = await importDefault<(prisma: any, id: string | number) => Promise<any>>(file);
    if (!mod) {
      console.warn(`[actions] No default export in ${file}`);
      continue;
    }
    results.push({ id: action.id, label: action.label, method: action.method, data: action.data, ...(action.condition && { condition: action.condition }), procedure: mod });
  }
  return results;
};

/**
 * Resolve each declared table-level action into a `ResourceTableAction`:
 * - `type: "link"` actions pass through as-is.
 * - Procedure actions import their function from `{basePath}/actions/{procedure}.ts`.
 *   The loaded function receives only `(prisma)` — no record id.
 */
export const loadTableActions = async (
  jsonActions: JsonTableAction[],
  basePath: string,
): Promise<ResourceTableAction[]> => {
  const results: ResourceTableAction[] = [];
  for (const action of jsonActions) {
    if (action.type === 'link') {
      results.push({ type: 'link', id: action.id, label: action.label, icon: action.icon, tooltip: action.tooltip, href: action.href });
      continue;
    }

    const file = findModule(join(basePath, 'actions'), action.procedure);
    if (!file) {
      console.warn(`[tableActions] Procedure file not found for "${action.id}" in ${basePath}/actions/`);
      continue;
    }
    const mod = await importDefault<(prisma: any) => Promise<any>>(file);
    if (!mod) {
      console.warn(`[tableActions] No default export in ${file}`);
      continue;
    }
    results.push({ id: action.id, label: action.label, icon: action.icon, tooltip: action.tooltip, method: action.method, data: action.data, procedure: mod });
  }
  return results;
};
