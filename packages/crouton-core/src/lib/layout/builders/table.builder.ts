import type { z } from 'zod';

import type { LayoutBuildContext, ViewConfig } from './layout-builder.types';
import { buildView, emptyTableView } from './view-helpers';
import type { TableLayoutRootSchema } from '../../resource/layout/TableLayout.schema';
import { buildFormUiSchema, orderTableColumnsFromLayout, patchFilterProperties, resolveDefaultSort, resolveTableNode } from '../../view';
import { columnForContext } from '../../view/column.utils';
import { buildTableUiSchema } from '../../view/table-schema.builder';

type TableLayoutRoot = z.infer<typeof TableLayoutRootSchema>;

/**
 * Build the table view (and optional filter view) for a resource.
 * Returns a record with `table` always present, and `filter` when filterFields exist.
 */
export const buildTableLayout = (
  node: TableLayoutRoot | undefined,
  ctx: LayoutBuildContext,
): Record<string, ViewConfig> => {
  const { columns, source } = ctx;
  const views: Record<string, ViewConfig> = {};

  const tableCols = columns?.map((c) => columnForContext(c, 'table'));
  let table = buildView(source, tableCols, (c) => !c.hiddenInTable, buildTableUiSchema, true);
  if (table) {
    const defaultSortResult = resolveDefaultSort(
      table.columns as any[],
      columns,
      resolveTableNode(node) as any,
    );
    table.defaultSort = defaultSortResult?.id;
    table.defaultSortDir = defaultSortResult?.dir;
    if (node) table = orderTableColumnsFromLayout(table, node as any, ctx.warn);

    const tableNode = resolveTableNode(node as any);
    if (tableNode) {
      const nodeOpts: Record<string, unknown> = {};
      if (tableNode.pageSize != null) nodeOpts['pageSize'] = tableNode.pageSize;
      if (tableNode.pageSizes != null) nodeOpts['pageSizes'] = tableNode.pageSizes;
      if (tableNode.density != null) nodeOpts['density'] = tableNode.density;
      if (tableNode.selectable != null) nodeOpts['selectable'] = tableNode.selectable;
      if (tableNode.rowClick != null) nodeOpts['rowClick'] = tableNode.rowClick;
      if (tableNode.emptyText != null) nodeOpts['emptyText'] = tableNode.emptyText;
      if (Object.keys(nodeOpts).length) {
        const ui = table.ui_schema as Record<string, unknown>;
        table.ui_schema = { ...ui, options: { ...((ui['options'] as object) ?? {}), ...nodeOpts } };
      }
    }

    views.table = table;
  } else if (columns !== undefined) {
    views.table = emptyTableView();
  }

  const filterFields = resolveTableNode(node)?.filterFields;
  if (filterFields?.length) {
    const isFilterable = (c: { id: string }) => filterFields.includes(c.id);
    const filter = buildView(
      source,
      columns,
      (c) => isFilterable(c),
      buildFormUiSchema,
      true,
    );
    if (filter) {
      patchFilterProperties(filter.json_schema as Record<string, any>, columns?.filter(isFilterable));
      views.filter = filter;
    }
  }

  return views;
};
