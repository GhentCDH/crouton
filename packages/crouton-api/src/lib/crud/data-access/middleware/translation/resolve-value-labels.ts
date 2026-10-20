import type { ValueLabelColumn } from '../resource/valueLabel';
import type { ResourceConfigRegistry } from '../resource-config.registry';
import { getRequestLanguage } from './language.context';

/**
 * Resolve value-label columns for the current request language.
 *
 * When a language is active and the config registry holds a localized config,
 * the localized `valueLabelColumns` (with translated enum labels) are returned.
 * Otherwise the boot-time columns are returned unchanged.
 *
 * @param route        - Resource route (used to look up the localized config).
 * @param bootTimeCols - The valueLabelColumns from the boot-time config.
 * @param configRegistry - Optional config registry for localized lookup.
 * @param childRoute   - When set, resolve the sub-resource's valueLabelColumns instead.
 */
export const resolveValueLabelColumns = async (
  route: string,
  bootTimeCols: ValueLabelColumn[] | undefined,
  configRegistry?: ResourceConfigRegistry,
  childRoute?: string,
): Promise<ValueLabelColumn[] | undefined> => {
  if (!configRegistry) return bootTimeCols;
  const language = getRequestLanguage();
  if (!language) return bootTimeCols;
  const localized = await configRegistry.getByRoute(route, language);
  if (!localized) return bootTimeCols;
  if (!childRoute) return localized.valueLabelColumns ?? bootTimeCols;
  const sub = (localized.subResources ?? []).find(
    (s) => s.childRoute === childRoute,
  );
  return sub?.valueLabelColumns ?? bootTimeCols;
};
