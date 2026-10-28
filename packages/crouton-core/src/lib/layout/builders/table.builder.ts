import type { z } from 'zod';

import type { LayoutBuildContext, ViewConfig } from './layout-builder.types';
import { buildView, emptyTableView } from './view-helpers';
import type { JsonColumn } from '../../resource/Column';
import { buildFormUiSchema, orderTableColumnsFromLayout, patchFilterProperties, resolveDefaultSort, resolveTableNode } from '../../view';
import { columnForContext } from '../../schema/column/column.utils';
import { buildTableUiSchema } from '../../schema/column/table-cell';
import type { LayoutNode } from '../schema';
import type { TableLayoutRootSchema } from '../schema/TableLayout.schema';

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
  let table = buildView(source, tableCols, (c) => !c.hiddenInTable, buildTableUiSchema, true, undefined, ctx.resourceName);
  if (table) {
    const defaultSortResult = resolveDefaultSort(
      (table.columns ?? []) as JsonColumn[],
      columns,
      resolveTableNode(node) as LayoutNode | undefined,
    );
    table.defaultSort = defaultSortResult?.id;
    table.defaultSortDir = defaultSortResult?.dir;
    if (node) table = orderTableColumnsFromLayout(table, node as LayoutNode, ctx.warn);

    const tableNode = resolveTableNode(node);
    if (tableNode) {
      const { pageSize, pageSizes, density, rowClick, selectable, emptyText } = tableNode;
      const ui = table.ui_schema as Record<string, unknown>;
      table.ui_schema = {
        ...ui,
        options: {
          ...((ui['options'] as object) ?? {}),
          pageSize,
          pageSizes,
          density,
          rowClick,
          ...(selectable != null && { selectable }),
          ...(emptyText != null && { emptyText }),
        },
      };
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
      undefined,
      ctx.resourceName,
    );
    if (filter) {
      patchFilterProperties(filter.json_schema as Record<string, unknown>, columns?.filter(isFilterable));
      views.filter = filter;
    }
  }

  return views;
};
