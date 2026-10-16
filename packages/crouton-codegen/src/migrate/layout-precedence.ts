/**
 * Layout-precedence codemod.
 *
 * After the layout-wins change, a layout is the *full* list for its context.
 * This transform makes existing resource.json files produce the same output as
 * before by:
 *
 * 1. Appending columns that the old code would have appended (visible by flag,
 *    not listed in the layout) to the end of the layout for that context.
 * 2. Removing columns that are listed in the layout but have hiddenIn<Ctx>:
 *    true — old code dropped them; new code shows them.
 *
 * Contexts without a layout are untouched.
 */

export type LayoutPrecedenceReport = {
  appended: Record<'form' | 'view' | 'table', string[]>;
  removed: Record<'form' | 'view' | 'table', string[]>;
};

type RawLayout = Record<string, unknown>;
type RawFormNode = { items?: unknown[] };

const getFieldId = (item: unknown): string | null => {
  if (typeof item === 'string') return item;
  if (typeof item === 'object' && item !== null && 'id' in item)
    return (item as Record<string, unknown>)['id'] as string;
  return null; // component item
};

const collectFormNodeIds = (node: RawFormNode): Set<string> => {
  const ids = new Set<string>();
  for (const item of node.items ?? []) {
    const id = getFieldId(item);
    if (id !== null) {
      ids.add(id);
    } else if (
      typeof item === 'object' &&
      item !== null &&
      'items' in item &&
      !('component' in item)
    ) {
      for (const nested of collectFormNodeIds(item as RawFormNode)) {
        ids.add(nested);
      }
    }
  }
  return ids;
};

/** Depth-first search for the table node in a raw table layout. */
const findRawTableNode = (node: RawLayout): RawLayout => {
  if (!node['type'] || node['type'] === 'table') return node;
  const items = node['items'];
  if (!Array.isArray(items)) return node;
  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as RawLayout;
    if (!obj['component']) {
      const found = findRawTableNode(obj);
      if (!found['type'] || found['type'] === 'table') return found;
    }
  }
  return node;
};

const collectTableIds = (tableLayout: RawLayout): Set<string> => {
  const tableNode = findRawTableNode(tableLayout);
  const ids = new Set<string>();
  for (const item of (tableNode['items'] as unknown[] | undefined) ?? []) {
    const id = getFieldId(item);
    if (id !== null) ids.add(id);
  }
  return ids;
};

const removeFromFormNode = (
  node: RawFormNode,
  toRemove: Set<string>,
): RawFormNode => ({
  ...node,
  items: (node.items ?? [])
    .filter((item) => {
      const id = getFieldId(item);
      return id === null || !toRemove.has(id);
    })
    .map((item) => {
      if (
        typeof item === 'object' &&
        item !== null &&
        'items' in item &&
        !('component' in item)
      ) {
        return removeFromFormNode(item as RawFormNode, toRemove);
      }
      return item;
    }),
});

const removeFromTableNode = (
  node: RawLayout,
  toRemove: Set<string>,
): RawLayout => ({
  ...node,
  items: ((node['items'] as unknown[]) ?? []).filter((item) => {
    const id = getFieldId(item);
    return id === null || !toRemove.has(id);
  }),
});

const removeFromTableLayout = (
  layout: RawLayout,
  toRemove: Set<string>,
): RawLayout => {
  const tableNode = findRawTableNode(layout);
  if (tableNode === layout) return removeFromTableNode(layout, toRemove);
  // wrapper: patch the nested table node in-place (structurally)
  const patchItems = (node: RawLayout): RawLayout => ({
    ...node,
    items: ((node['items'] as unknown[]) ?? []).map((item) => {
      if (typeof item !== 'object' || item === null) return item;
      const obj = item as RawLayout;
      if (obj['component']) return obj;
      if (!obj['type'] || obj['type'] === 'table') {
        return removeFromTableNode(obj, toRemove);
      }
      return patchItems(obj);
    }),
  });
  return patchItems(layout);
};

const appendToFormLayout = (
  formLayout: RawFormNode,
  toAppend: string[],
): RawFormNode => ({
  ...formLayout,
  items: [...(formLayout.items ?? []), ...toAppend],
});

const appendToTableLayout = (
  tableLayout: RawLayout,
  toAppend: string[],
): RawLayout => {
  const tableNode = findRawTableNode(tableLayout);
  if (tableNode === tableLayout) {
    return {
      ...tableLayout,
      items: [...((tableLayout['items'] as unknown[]) ?? []), ...toAppend],
    };
  }
  // wrapper: patch nested table node
  const patchItems = (node: RawLayout): RawLayout => ({
    ...node,
    items: ((node['items'] as unknown[]) ?? []).map((item) => {
      if (typeof item !== 'object' || item === null) return item;
      const obj = item as RawLayout;
      if (obj['component']) return obj;
      if (!obj['type'] || obj['type'] === 'table') {
        return {
          ...obj,
          items: [...((obj['items'] as unknown[]) ?? []), ...toAppend],
        };
      }
      return patchItems(obj);
    }),
  });
  return patchItems(tableLayout);
};

type RawColumns = Record<string, Record<string, unknown>>;

const parseColumns = (raw: unknown): RawColumns => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as RawColumns;
};

export const migrateLayoutPrecedence = (
  resource: Record<string, unknown>,
): { resource: Record<string, unknown>; report: LayoutPrecedenceReport } => {
  const report: LayoutPrecedenceReport = {
    appended: { form: [], view: [], table: [] },
    removed: { form: [], view: [], table: [] },
  };

  const rawLayout = resource['layout'] as RawLayout | undefined;
  if (!rawLayout) return { resource, report };

  const rawColumns = parseColumns(resource['columns']);
  const columnIds = Object.keys(rawColumns);

  let layout = { ...rawLayout };

  // ── form context ──────────────────────────────────────────────────────────
  if (layout['form']) {
    const formLayout = layout['form'] as RawFormNode;
    const listed = collectFormNodeIds(formLayout);

    const hiddenListed = columnIds.filter(
      (id) => listed.has(id) && rawColumns[id]['hiddenInForm'] === true,
    );
    const visibleUnlisted = columnIds.filter(
      (id) => !listed.has(id) && rawColumns[id]['hiddenInForm'] !== true,
    );

    let updated = formLayout;
    if (hiddenListed.length) {
      updated = removeFromFormNode(updated, new Set(hiddenListed));
      report.removed.form = hiddenListed;
    }
    if (visibleUnlisted.length) {
      updated = appendToFormLayout(updated, visibleUnlisted);
      report.appended.form = visibleUnlisted;
    }
    layout = { ...layout, form: updated };
  }

  // ── view context ──────────────────────────────────────────────────────────
  if (layout['view']) {
    const viewLayout = layout['view'] as RawFormNode;
    const listed = collectFormNodeIds(viewLayout);

    const hiddenListed = columnIds.filter(
      (id) => listed.has(id) && rawColumns[id]['hiddenInView'] === true,
    );
    const visibleUnlisted = columnIds.filter(
      (id) => !listed.has(id) && rawColumns[id]['hiddenInView'] !== true,
    );

    let updated = viewLayout;
    if (hiddenListed.length) {
      updated = removeFromFormNode(updated, new Set(hiddenListed));
      report.removed.view = hiddenListed;
    }
    if (visibleUnlisted.length) {
      updated = appendToFormLayout(updated, visibleUnlisted);
      report.appended.view = visibleUnlisted;
    }
    layout = { ...layout, view: updated };
  }

  // ── table context ─────────────────────────────────────────────────────────
  if (layout['table']) {
    const tableLayout = layout['table'] as RawLayout;
    const listed = collectTableIds(tableLayout);

    const hiddenListed = columnIds.filter(
      (id) => listed.has(id) && rawColumns[id]['hiddenInTable'] === true,
    );
    const visibleUnlisted = columnIds.filter(
      (id) => !listed.has(id) && rawColumns[id]['hiddenInTable'] !== true,
    );

    let updated = tableLayout;
    if (hiddenListed.length) {
      updated = removeFromTableLayout(updated, new Set(hiddenListed));
      report.removed.table = hiddenListed;
    }
    if (visibleUnlisted.length) {
      updated = appendToTableLayout(updated, visibleUnlisted);
      report.appended.table = visibleUnlisted;
    }
    layout = { ...layout, table: updated };
  }

  return { resource: { ...resource, layout }, report };
};
