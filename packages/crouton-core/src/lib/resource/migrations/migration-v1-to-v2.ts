/**
 * Migration v1 → v2: `controls` → `items`, `actions` → `rowActions`, table
 * settings move from wrapper root to the inner `type: "table"` node.
 */

import type { RawResourceJson, ResourceMigration } from './types';

type RawNode = Record<string, unknown>;

const TABLE_SETTINGS = ['actions', 'rowActions', 'tableActions', 'searchFields', 'filterFields'] as const;


/** Merge controls into items at the front, delete controls. Pure. */
const mergeControlsIntoItems = (node: RawNode): RawNode => {
  const controls = Array.isArray(node['controls']) ? (node['controls'] as unknown[]) : [];
  const items = Array.isArray(node['items']) ? (node['items'] as unknown[]) : [];
  const merged = [...controls, ...items];
  const { controls: _c, items: _i, ...rest } = node;
  if (merged.length === 0) return rest;
  return { ...rest, items: merged };
};

/** Recursively transform a layout node (form/view context). */
const transformNode = (node: unknown): unknown => {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return node;
  const n = node as RawNode;
  const merged = mergeControlsIntoItems(n);
  if (!Array.isArray(merged['items'])) return merged;
  return { ...merged, items: (merged['items'] as unknown[]).map(transformNode) };
};

/** Transform layout.table: merge wrapper controls, move settings to table node. */
const transformTableLayout = (raw: unknown): unknown => {
  if (typeof raw !== 'object' || raw === null) return raw;
  const n = raw as RawNode;

  // Collect table-level settings from the wrapper before merging
  const wrapperSettings: RawNode = {};
  for (const key of TABLE_SETTINGS) {
    if (n[key] !== undefined) wrapperSettings[key] = n[key];
  }

  // Merge controls → items on the wrapper
  const merged = mergeControlsIntoItems(n);

  // Remove table settings from wrapper
  const cleanedWrapper = { ...merged };
  for (const key of TABLE_SETTINGS) delete cleanedWrapper[key];

  const items = Array.isArray(cleanedWrapper['items']) ? (cleanedWrapper['items'] as unknown[]) : [];
  const hasInnerTableNode = items.some(
    (n) => typeof n === 'object' && n !== null && (n as RawNode)['type'] === 'table',
  );

  if (!hasInnerTableNode) {
    // Flat table: the (merged) items are the columns; wrapper IS the table node
    const result = { ...cleanedWrapper };
    if (wrapperSettings['actions'] !== undefined && wrapperSettings['rowActions'] === undefined) {
      result['rowActions'] = wrapperSettings['actions'];
    } else if (wrapperSettings['rowActions'] !== undefined) {
      result['rowActions'] = wrapperSettings['rowActions'];
    }
    for (const key of ['tableActions', 'searchFields', 'filterFields'] as const) {
      if (wrapperSettings[key] !== undefined) result[key] = wrapperSettings[key];
    }
    return result;
  }

  // Recursively transform child nodes, then find the table node to inject settings
  const transformedItems = items.map((child) => {
    if (typeof child !== 'object' || child === null || Array.isArray(child)) return child;
    const c = child as RawNode;
    if (c['type'] === 'table') {
      // This is the inner table node — merge its own controls, inject wrapper settings
      const tableNode = mergeControlsIntoItems(c);
      const result = { ...tableNode };
      // wrapper settings → table node (table node's own value wins)
      if (wrapperSettings['actions'] !== undefined && result['rowActions'] === undefined && result['actions'] === undefined) {
        result['rowActions'] = wrapperSettings['actions'];
      }
      if (wrapperSettings['rowActions'] !== undefined && result['rowActions'] === undefined) {
        result['rowActions'] = wrapperSettings['rowActions'];
      }
      for (const key of ['tableActions', 'searchFields', 'filterFields'] as const) {
        if (wrapperSettings[key] !== undefined && result[key] === undefined) result[key] = wrapperSettings[key];
      }
      // rename own actions → rowActions
      if (result['actions'] !== undefined && result['rowActions'] === undefined) {
        result['rowActions'] = result['actions'];
        delete result['actions'];
      }
      return result;
    }
    // Non-table child: recurse as a generic node
    return transformNode(child);
  });

  return { ...cleanedWrapper, items: transformedItems };
};

/** Transform sub-resource actions → rowActions */
const transformSubResources = (subResources: unknown): unknown => {
  if (!Array.isArray(subResources)) return subResources;
  return subResources.map((sr) => {
    if (typeof sr !== 'object' || sr === null) return sr;
    const s = sr as RawNode;
    if (s['actions'] !== undefined && s['rowActions'] === undefined) {
      const { actions, ...rest } = s;
      return { ...rest, rowActions: actions };
    }
    return s;
  });
};

const migrate = (raw: RawResourceJson): RawResourceJson => {
  const result = { ...raw };

  const layout = raw['layout'] as RawNode | undefined;
  if (layout) {
    const newLayout: RawNode = { ...layout };
    if (layout['form']) newLayout['form'] = transformNode(layout['form']);
    if (layout['view']) newLayout['view'] = transformNode(layout['view']);
    if (layout['table']) newLayout['table'] = transformTableLayout(layout['table']);
    result['layout'] = newLayout;
  }

  if (raw['subResources']) {
    result['subResources'] = transformSubResources(raw['subResources']);
  }

  return result;
};

export const migration_v1_to_v2: ResourceMigration = {
  from: 1,
  to: 2,
  description: 'controls → items, actions → rowActions, table settings move to table node',
  migrate,
};
