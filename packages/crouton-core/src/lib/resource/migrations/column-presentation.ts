/**
 * Column cleanup codemod: presentation settings move from columns to layout items.
 *
 * Moved keys:
 * - `fieldInput.position` / `position` (incl. computed columns) → order of `layout.<ctx>.items`
 * - `fieldInput.options.{colspan,rowspan,width,hideLabel,readonly}` + column `hideLabel`
 *   → form/view layout item props
 * - `fieldInput.options.label` → dropped: the column label (always defaulted) already won
 *
 * Contexts without a layout only get one when stripping the keys would change what
 * renders (different order, or item props that need a home). Codegen writes positions
 * in source order, so most files just lose the redundant `position` keys.
 *
 * The order is computed with the real compile helpers on the parsed resource, before
 * and after stripping, so the generated layout matches what was rendered.
 */

import { resolveCalculatedPlacement } from '../../layout/resolve/calculated-placement';
import { nodeFieldIdOrder } from '../../layout/resolve/context-layout';
import { defaultLayoutFor } from '../../layout/resolve/default-layout';
import type { FormLayoutNode } from '../../layout/schema/LayoutNode.schema';
import { ResourceJsonSchema } from '../ResourceJson.schema';
import type { RawResourceJson } from './types';

type RawNode = Record<string, unknown>;
type ItemProps = Record<string, unknown>;
type Ctx = 'form' | 'view' | 'table';

const OPTION_PROPS = [
  'colspan',
  'rowspan',
  'width',
  'hideLabel',
  'readonly',
] as const;
/** Item props that object items default (Zod), so a column value never reached them. */
const DEFAULTED_PROPS = new Set(['colspan', 'rowspan', 'width']);
const CONTEXTS: Ctx[] = ['form', 'view', 'table'];

const isObj = (v: unknown): v is RawNode =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const withColumns = (
  columns: unknown,
  map: (id: string, col: RawNode) => RawNode,
): unknown => {
  if (Array.isArray(columns)) {
    return (columns as unknown[]).map((c) =>
      isObj(c) ? map(String(c['id']), c) : c,
    );
  }
  if (!isObj(columns)) return columns;
  return Object.fromEntries(
    Object.entries(columns).map(([id, c]) => [id, isObj(c) ? map(id, c) : c]),
  );
};

const stripPosition = (col: RawNode): RawNode => {
  const { position: _p, ...rest } = col;
  const fieldInput = rest['fieldInput'];
  if (!isObj(fieldInput) || !('position' in fieldInput)) return rest;
  const { position: _fp, ...fi } = fieldInput;
  return { ...rest, fieldInput: fi };
};

/** Strip presentation keys from one column; returns the clean column + the item props it carried. */
const stripColumn = (col: RawNode): { col: RawNode; props: ItemProps } => {
  const props: ItemProps = {};
  let next = stripPosition(col);

  const fieldInput = next['fieldInput'];
  const options = isObj(fieldInput) ? fieldInput['options'] : undefined;
  if (isObj(fieldInput) && isObj(options)) {
    const rest: RawNode = { ...options };
    for (const key of OPTION_PROPS) {
      if (rest[key] !== undefined) props[key] = rest[key];
      delete rest[key];
    }
    // Dead today: buildFormControl applies the (always defaulted) column label after it.
    delete rest['label'];
    const { options: _o, ...fi } = fieldInput;
    next = {
      ...next,
      fieldInput: Object.keys(rest).length ? { ...fi, options: rest } : fi,
    };
  }

  // Column-level hideLabel is applied after the options, so `true` wins.
  if ('hideLabel' in next) {
    const { hideLabel, ...rest } = next;
    if (hideLabel === true) props['hideLabel'] = true;
    next = rest;
  }
  return { col: next, props };
};

/** Copy column props onto the field items of a form/view layout node (recursive). */
const applyPropsToNode = (
  node: unknown,
  props: Map<string, ItemProps>,
): unknown => {
  if (!isObj(node) || !Array.isArray(node['items'])) return node;
  const items = (node['items'] as unknown[]).map((item) => {
    if (typeof item === 'string') {
      const p = props.get(item);
      return p ? { id: item, ...p } : item;
    }
    if (!isObj(item)) return item;
    if (typeof item['id'] === 'string') {
      const p = props.get(item['id']);
      if (!p) return item;
      const merged: RawNode = { ...item };
      for (const [k, v] of Object.entries(p)) {
        if (!DEFAULTED_PROPS.has(k) && merged[k] === undefined) merged[k] = v;
      }
      return merged;
    }
    if ('component' in item) return item;
    return applyPropsToNode(item, props);
  });
  return { ...node, items };
};

/** Field ids a context renders when it has no layout, as compile would order them. */
const fallbackOrder = (raw: RawResourceJson, ctx: Ctx): string[] | null => {
  const parsed = ResourceJsonSchema.safeParse(raw);
  if (!parsed.success) return null;
  const columns = parsed.data.columns ?? [];
  if (ctx === 'form')
    return nodeFieldIdOrder(
      defaultLayoutFor('form', columns) as FormLayoutNode | undefined,
      'form',
    );
  // Computed columns (`columns[id].computed`) slot in by position here.
  return resolveCalculatedPlacement(undefined, columns, [], ctx).order;
};

/**
 * A table without `layout.table` emits no node options, so the frontend falls back to
 * no row click and its own page-size list. An explicit table node defaults those to
 * `rowClick: 'view'` / `pageSizes: [20, 50, 100]`; pin today's behaviour instead.
 * (`pageSize: 20` and `density: 'normal'` already match.)
 */
const NO_LAYOUT_TABLE_BEHAVIOUR = {
  rowClick: 'none',
  pageSizes: [10, 20, 50, 100],
};

const sameOrder = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((id, i) => id === b[i]);

export const migrateColumnPresentation = (
  raw: RawResourceJson,
): RawResourceJson => {
  const props = new Map<string, ItemProps>();
  const columns = withColumns(raw['columns'], (id, col) => {
    const stripped = stripColumn(col);
    if (Object.keys(stripped.props).length) props.set(id, stripped.props);
    return stripped.col;
  });
  const stripped: RawResourceJson = { ...raw, columns };
  if (JSON.stringify(stripped) === JSON.stringify(raw)) return raw;

  const layout: RawNode = isObj(raw['layout']) ? { ...raw['layout'] } : {};
  for (const ctx of CONTEXTS) {
    // ponytail: props only go to form/view. Record/date-range/object cells also forward
    // fieldInput.options to the table, so a `width` there is lost for the table header;
    // add a table-item `width` if anyone relied on it.
    const usesProps = ctx !== 'table' && props.size > 0;
    if (layout[ctx] !== undefined) {
      if (usesProps) layout[ctx] = applyPropsToNode(layout[ctx], props);
      continue;
    }
    const before = fallbackOrder(raw, ctx);
    // ponytail: an unparseable file keeps its keys; schema validation reports it.
    if (!before) return raw;
    const after = fallbackOrder(stripped, ctx) ?? [];
    const needsProps = usesProps && before.some((id) => props.has(id));
    if (!needsProps && sameOrder(before, after)) continue;
    layout[ctx] = {
      items: before.map((id) => {
        const p = ctx === 'table' ? undefined : props.get(id);
        return p ? { id, ...p } : id;
      }),
      ...(ctx === 'table' ? NO_LAYOUT_TABLE_BEHAVIOUR : {}),
    };
  }

  return Object.keys(layout).length ? { ...stripped, layout } : stripped;
};
