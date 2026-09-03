import type { LayoutNode } from '../resource/Layout.schema';
import type { ViewConfig } from './view.schema';
import { flattenLayoutControlIds } from './layout-ui-schema.builder';

/**
 * Reorder a table view's elements and columns to match the `layout.table` declaration.
 * Unreferenced visible columns keep their relative order at the end.
 */
export const orderTableColumnsFromLayout = (
  view: ViewConfig,
  node: LayoutNode,
  warn: (msg: string) => void = console.warn,
): ViewConfig => {
  const orderedIds = flattenLayoutControlIds(node);
  if (!orderedIds.length) return view;

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

  for (const id of orderedIds) {
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
