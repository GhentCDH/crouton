import { flattenLayoutControls } from './layout-ui-schema.builder';
import type { ViewConfig } from './view.schema';
import { isComponentControl } from '../resource/Layout.schema';
import type { LayoutNode } from '../resource/Layout.schema';

/** Find the `type: "table"` sub-node inside a wrapper layout, or return the node itself. */
export const findTableNode = (node: LayoutNode): LayoutNode =>
  node.type !== 'table' && node.items?.length
    ? node.items.find((i) => i.type === 'table') ?? node
    : node;

/** True when `layout.table` is a wrapper layout (outer type ≠ "table") with a "table" sub-node. */
export const isTableWrapperLayout = (node: LayoutNode): boolean =>
  node.type !== 'table' && !!node.items?.some((i) => i.type === 'table');

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
  const controls = flattenLayoutControls(tableNode);
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
      warn(`layout.table: column "${id}" not found in visible table columns — skipping`);
      continue;
    }
    seen.add(id);
    const el = elementById.get(id);
    if (el) reorderedElements.push(el);
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

  return {
    ...view,
    ui_schema: { ...(view.ui_schema as any), elements: reorderedElements },
    columns: reorderedColumns,
  };
};
