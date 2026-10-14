import type { z } from 'zod';

import { flattenLayoutItems } from './layout-ui-schema.builder';
import type { ViewConfig } from './view.schema';
import type { LayoutNode } from '../resource/layout';
import { isComponentControl, isComponentItem } from '../resource/layout';
import type { TableLayoutRootSchema, TableNode } from '../resource/layout/TableLayout.schema';

const LAYOUT_TYPE_MAP: Record<string, string> = {
  grid: 'GridLayout',
  vertical: 'VerticalLayout',
  horizontal: 'HorizontalLayout',
  collapse: 'CollapseLayout',
  group: 'Group',
};

const mapLayoutType = (type: LayoutNode['type']): string =>
  (type && LAYOUT_TYPE_MAP[type]) ?? 'VerticalLayout';

/** Find the `type: "table"` sub-node inside a wrapper layout, or return the node itself. */
export const findTableNode = (node: LayoutNode): LayoutNode =>
  node.type !== 'table' && node.items?.length
    ? (node.items.find((i) => typeof i !== 'string' && !('id' in i) && !('component' in i) && (i as LayoutNode).type === 'table') as LayoutNode ?? node)
    : node;

/**
 * Depth-first search for the table node in a `TableLayoutRoot`.
 * Returns the node itself if it is a table node (no `type` or `type: "table"`),
 * or the first descendant with `type: "table"`.
 */
export const resolveTableNode = (
  layout: z.infer<typeof TableLayoutRootSchema> | LayoutNode | undefined,
): TableNode | undefined => {
  if (!layout) return undefined;
  const node = layout as Record<string, unknown>;
  if (!node['type'] || node['type'] === 'table') return layout as TableNode;
  const items = node['items'];
  if (!Array.isArray(items)) return undefined;
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const found = resolveTableNode(item as LayoutNode);
    if (found) return found;
  }
  return undefined;
};

/** True when `layout.table` is a wrapper layout (outer type ≠ "table") with a "table" sub-node. */
export const isTableWrapperLayout = (node: LayoutNode): boolean =>
  node.type !== 'table' && !!node.items?.some((i) => typeof i !== 'string' && !('id' in i) && !('component' in i) && (i as LayoutNode).type === 'table');

/**
 * Reorder a table view's elements and columns to match the `layout.table` declaration.
 * When the node is a wrapper layout (type ≠ "table"), only the nested "table" sub-node
 * controls determine column order. Outer component controls are part of the wrapper UI,
 * not table columns.
 * Unreferenced visible columns keep their relative order at the end.
 */
export const orderTableColumnsFromLayout = (
  view: ViewConfig,
  node: LayoutNode,
  warn: (msg: string) => void = console.warn,
): ViewConfig => {
  const tableNode = findTableNode(node);
  const controls = flattenLayoutItems(tableNode);
  if (!controls.length) return view;

  const elements: any[] = (view.ui_schema as any)?.elements ?? [];
  const columns: any[] = view.columns ?? [];

  const elementById = new Map(
    elements.map((el) => {
      const id = (el.scope as string | undefined)?.replace('#/properties/', '');
      return [id, el];
    }),
  );
  const columnById = new Map(columns.map((c: any) => [c.id, c]));
  const knownIds = new Set([...elementById.keys()].filter(Boolean) as string[]);

  const reorderedElements: any[] = [];
  const reorderedColumns: any[] = [];
  const seen = new Set<string>();

  for (const ctrl of controls) {
    if (isComponentControl(ctrl)) {
      reorderedElements.push({
        type: 'ComponentCell',
        options: { component: ctrl.component, label: ctrl.label },
      });
      reorderedColumns.push({
        id: `__component__${ctrl.component}`,
        label: ctrl.label ?? '',
        type: 'ComponentCell',
        scope: `#/properties/__component__${ctrl.component}`,
      });
      continue;
    }
    const id = typeof ctrl === 'string' ? ctrl : ctrl.id;
    if (!knownIds.has(id)) {
      warn(
        `layout.table: column "${id}" not found in visible table columns — skipping`,
      );
      continue;
    }
    seen.add(id);
    const el = elementById.get(id);
    if (el) {
      const ctrlObj = typeof ctrl === 'string' ? null : (ctrl as any);
      const overrides: Record<string, unknown> = {};
      // Apply sortable/defaultSort from layout control
      if (ctrlObj?.sortable === false) {
        overrides['sortable'] = false;
      } else if (ctrlObj?.sortable === true && el.options?.sortId == null) {
        // sortable: true but no sortId derived — use column id
        overrides['sortId'] = id;
      }
      // Apply type/options overrides (replaces fieldTable)
      const typeOverride = ctrlObj?.type;
      const optOverride = ctrlObj?.options;
      reorderedElements.push(
        typeOverride || optOverride || Object.keys(overrides).length
          ? {
              ...el,
              ...(typeOverride && { type: typeOverride }),
              options: {
                ...(el.options ?? {}),
                ...(optOverride ?? {}),
                ...overrides,
              },
            }
          : el,
      );
    }
    const col = columnById.get(id);
    if (col) reorderedColumns.push(col);
  }

  // Append unreferenced visible columns in their original relative order
  for (const el of elements) {
    const id = (el.scope as string | undefined)?.replace('#/properties/', '');
    if (id && !seen.has(id)) {
      reorderedElements.push(el);
      const col = columnById.get(id);
      if (col) reorderedColumns.push(col);
    }
  }

  const innerTableUi = {
    ...(view.ui_schema as any),
    elements: reorderedElements,
  };

  if (!isTableWrapperLayout(node)) {
    return {
      ...view,
      ui_schema: innerTableUi,
      columns: reorderedColumns,
    };
  }

  // Wrapper layout: produce outer UI node containing component elements + inner Table element
  const outerType = mapLayoutType(node.type);
  const outerElements: any[] = [
    ...((node as any).items ?? [])
      .filter(isComponentItem)
      .map((ctrl: any) => ({
        component: ctrl.component,
        label: ctrl.label,
        ...(ctrl.colspan != null && { colspan: ctrl.colspan }),
        ...(ctrl.rowspan != null && { rowspan: ctrl.rowspan }),
      })),
    innerTableUi,
  ];

  return {
    ...view,
    ui_schema: {
      type: outerType,
      ...(node.columns != null && { columns: node.columns }),
      elements: outerElements,
    },
    columns: reorderedColumns,
  };
};
