/**
 * Apply translations to a Resource config.
 *
 * Patches column labels, resource title, sidebar label, action labels,
 * and the corresponding JSON Schema `title` properties in views —
 * without rebuilding views from scratch (no Zod schema needed).
 */

import type { JsonColumn, Translator, ViewConfig } from '@ghentcdh/crouton-core';
import {
  columnKey,
  resourceTitleKey,
  resourceSidebarKey,
  actionKey,
  subResourceTitleKey,
  subResourceColumnKey,
} from '@ghentcdh/crouton-core';

import { type Resource } from '../resource/ResourceConfig.schema';
import type { SubResourceConfig } from '../resource/SubResource.schema';

/** Deep-clone a plain object (JSON-safe). */
const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

/**
 * Patch `json_schema.properties[key].title` for each column whose label
 * was translated. This keeps the JSON Schema titles in sync with the
 * translated column labels without rebuilding views.
 */
const patchViewTitles = (
  views: Record<string, ViewConfig> | undefined,
  columnLabels: Map<string, string>,
): Record<string, ViewConfig> | undefined => {
  if (!views) return views;

  const patched: Record<string, ViewConfig> = {};
  for (const [viewName, view] of Object.entries(views)) {
    const patchedView = clone(view);

    // Patch json_schema.properties[col].title
    const props = (patchedView.json_schema as Record<string, unknown>)?.properties;
    if (props && typeof props === 'object') {
      for (const [key, prop] of Object.entries(
        props as Record<string, Record<string, unknown>>,
      )) {
        const translated = columnLabels.get(key);
        if (translated && prop && typeof prop === 'object') {
          prop.title = translated;
        }
      }
    }

    // Patch view.columns[].label
    if (patchedView.columns) {
      patchedView.columns = patchedView.columns.map((vc) => {
        const translated = columnLabels.get(vc.id);
        return translated ? { ...vc, label: translated } : vc;
      });
    }

    patched[viewName] = patchedView;
  }
  return patched;
};

/**
 * Produce a localized clone of a Resource. The original is never mutated.
 *
 * What is translated:
 *  - `title`, `sidebar.label`
 *  - `columns[].label`
 *  - `views` JSON Schema `title` properties + `columns[].label`
 *  - `actions[].label`, `tableActions[].label`
 *  - `subResources[].title`, `subResources[].columns.label`, `subResources[].views`
 *
 * What is NOT translated (identity):
 *  - `definition`, `hooks`, `repository`, `include`, `lookup`, URIs
 */
export const localizeResource = (
  config: Resource,
  t: Translator,
): Resource => {
  const name = config.name;
  const localized = clone(config);

  // Title
  localized.title = t(
    resourceTitleKey(name),
    config.title ?? config.tag,
  );

  // Sidebar label
  if (localized.sidebar) {
    const sidebarTranslation = t(
      resourceSidebarKey(name),
      config.sidebar?.label,
    );
    // Only set if we got a real translation (not the path back)
    if (sidebarTranslation !== resourceSidebarKey(name)) {
      localized.sidebar = { ...localized.sidebar, label: sidebarTranslation };
    }
  }

  // Columns
  const columnLabels = new Map<string, string>();
  const columns = localized.columns as unknown as JsonColumn[] | undefined;
  if (columns) {
    for (const col of columns) {
      const translated = t(
        columnKey(name, col.id),
        col.label ?? col.id,
      );
      col.label = translated;
      columnLabels.set(col.id, translated);
    }
  }

  // Views — patch JSON Schema titles + view column labels
  if (localized.views) {
    localized.views = patchViewTitles(localized.views, columnLabels) as Resource['views'];
  }

  // Actions
  if (localized.actions) {
    for (const a of localized.actions) {
      a.label = t(actionKey(name, a.id), a.label);
    }
  }
  if (localized.tableActions) {
    for (const a of localized.tableActions) {
      a.label = t(actionKey(name, a.id), a.label);
    }
  }

  // Sub-resources
  if (localized.subResources) {
    for (const sub of localized.subResources as SubResourceConfig[]) {
      const subName = sub.name ?? sub.childRoute;
      sub.title = t(
        subResourceTitleKey(name, subName),
        sub.title ?? subName,
      );

      // Sub-resource view columns
      const subColumnLabels = new Map<string, string>();
      if (sub.views) {
        for (const view of Object.values(sub.views)) {
          if (view.columns) {
            for (const vc of view.columns) {
              const translated = t(
                subResourceColumnKey(name, subName, vc.id),
                vc.label ?? vc.id,
              );
              vc.label = translated;
              subColumnLabels.set(vc.id, translated);
            }
          }
        }
        sub.views = patchViewTitles(
          sub.views as Record<string, ViewConfig>,
          subColumnLabels,
        ) as typeof sub.views;
      }
    }
  }

  return localized;
};
