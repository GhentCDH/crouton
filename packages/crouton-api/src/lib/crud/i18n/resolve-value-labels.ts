import type { ValueLabelColumn } from '../data-access/middleware/value-label';
import type { ResourceConfigRegistry } from '../resource-config.registry';

/**
 * Resolve value-label columns for the given route.
 *
 * Returns the boot-time `valueLabelColumns` from the config registry,
 * or falls back to `bootTimeCols` when the registry has no entry.
 * Enum label translation for `__label` fields is handled client-side.
 *
 * @param route        - Resource route (used to look up the config).
 * @param bootTimeCols - The valueLabelColumns from the boot-time config.
 * @param configRegistry - Optional config registry for lookup.
 * @param childRoute   - When set, resolve the sub-resource's valueLabelColumns instead.
 */
export const resolveValueLabelColumns = async (
  route: string,
  bootTimeCols: ValueLabelColumn[] | undefined,
  configRegistry?: ResourceConfigRegistry,
  childRoute?: string,
): Promise<ValueLabelColumn[] | undefined> => {
  if (!configRegistry) return bootTimeCols;
  const config = await configRegistry.getByRoute(route);
  if (!config) return bootTimeCols;
  if (!childRoute) return config.valueLabelColumns ?? bootTimeCols;
  const sub = (config.subResources ?? []).find(
    (s) => s.childRoute === childRoute,
  );
  return sub?.valueLabelColumns ?? bootTimeCols;
};
