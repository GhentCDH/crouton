/**
 * Deprecated field codemods.
 *
 * `migrateSearchFields` — moves deprecated search config to `operations.findAll.search`:
 *   - `layout.table.searchFields` → `operations.findAll.search`
 *   - column `searchable: true` → `operations.findAll.search`
 *
 * `migrateRemovedColumnFields` — removes deprecated column-level fields:
 *   - `fieldView` → deleted (use `layout.view.items[].type/options` instead)
 *   - `columnType` → deleted (use the top-level `type` field instead)
 */

export type SearchFieldsMigrationReport = {
  fromLayout: string[];
  fromColumns: string[];
};

type RawNode = Record<string, unknown>;

const collectAndRemoveSearchFields = (
  node: unknown,
): { node: unknown; fields: string[] } => {
  if (typeof node !== 'object' || node === null) return { node, fields: [] };
  const n = node as RawNode;

  // Flat or inner table node: has searchFields directly
  if (n['type'] === 'table' || !n['type']) {
    const fields = Array.isArray(n['searchFields'])
      ? (n['searchFields'] as string[])
      : [];
    if (fields.length) {
      const { searchFields: _sf, ...rest } = n;
      return { node: rest, fields };
    }
    return { node: n, fields: [] };
  }

  // Wrapper node: recurse into items to find the table node
  if (!Array.isArray(n['items'])) return { node: n, fields: [] };

  let collected: string[] = [];
  const newItems = (n['items'] as unknown[]).map((item) => {
    const result = collectAndRemoveSearchFields(item);
    collected = [...collected, ...result.fields];
    return result.node;
  });

  return { node: { ...n, items: newItems }, fields: collected };
};

export const migrateSearchFields = (
  resource: Record<string, unknown>,
): { resource: Record<string, unknown>; report: SearchFieldsMigrationReport } => {
  const report: SearchFieldsMigrationReport = { fromLayout: [], fromColumns: [] };

  // Check if already migrated (explicit search declared)
  const existingFindAll = (resource['operations'] as RawNode | undefined)?.['findAll'];
  if (typeof existingFindAll === 'object' && existingFindAll !== null && Array.isArray((existingFindAll as RawNode)['search'])) {
    return { resource, report };
  }

  // Collect from layout.table
  let result = { ...resource };
  const rawLayout = resource['layout'] as RawNode | undefined;
  if (rawLayout?.['table']) {
    const { node: newTable, fields } = collectAndRemoveSearchFields(rawLayout['table']);
    if (fields.length) {
      report.fromLayout = fields;
      result = { ...result, layout: { ...rawLayout, table: newTable } };
    }
  }

  // Collect from columns (searchable: true)
  const rawColumns = resource['columns'] as Record<string, RawNode> | undefined;
  if (rawColumns && typeof rawColumns === 'object' && !Array.isArray(rawColumns)) {
    const searchableCols: string[] = [];
    const newColumns: Record<string, RawNode> = {};
    for (const [id, col] of Object.entries(rawColumns)) {
      if (col['searchable'] === true) {
        searchableCols.push(id);
        const { searchable: _s, ...rest } = col;
        newColumns[id] = rest;
      } else {
        newColumns[id] = col;
      }
    }
    if (searchableCols.length) {
      report.fromColumns = searchableCols;
      result = { ...result, columns: newColumns };
    }
  }

  const allSearchFields = [...new Set([...report.fromLayout, ...report.fromColumns])];
  if (!allSearchFields.length) return { resource, report };

  // Merge into operations.findAll
  const ops = (result['operations'] as RawNode | undefined) ?? {};
  const findAll = ops['findAll'];
  const newFindAll =
    typeof findAll === 'object' && findAll !== null
      ? { ...(findAll as RawNode), search: allSearchFields }
      : { search: allSearchFields };

  result = { ...result, operations: { ...ops, findAll: newFindAll } };
  return { resource: result, report };
};

export type RemovedColumnFieldsReport = {
  columnsWithFieldView: string[];
  columnsWithColumnType: string[];
};

/**
 * Remove deprecated column-level fields:
 * - `fieldView` (replaced by `layout.view.items[].type/options`)
 * - `columnType` (replaced by the top-level `type` field)
 */
export const migrateRemovedColumnFields = (
  resource: Record<string, unknown>,
): { resource: Record<string, unknown>; report: RemovedColumnFieldsReport } => {
  const report: RemovedColumnFieldsReport = {
    columnsWithFieldView: [],
    columnsWithColumnType: [],
  };

  const rawColumns = resource['columns'] as Record<string, RawNode> | undefined;
  if (!rawColumns || typeof rawColumns !== 'object' || Array.isArray(rawColumns)) {
    return { resource, report };
  }

  let changed = false;
  const newColumns: Record<string, RawNode> = {};
  for (const [id, col] of Object.entries(rawColumns)) {
    let newCol = col;
    if ('fieldView' in col) {
      report.columnsWithFieldView.push(id);
      const { fieldView: _fv, ...rest } = newCol;
      newCol = rest;
      changed = true;
    }
    if ('columnType' in col) {
      report.columnsWithColumnType.push(id);
      const { columnType: _ct, ...rest } = newCol;
      newCol = rest;
      changed = true;
    }
    newColumns[id] = newCol;
  }

  if (!changed) return { resource, report };
  return { resource: { ...resource, columns: newColumns }, report };
};
