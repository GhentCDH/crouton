/**
 * `crouton migrate` codemods — rewrite a raw resource.json to the current shape.
 *
 * Every transform is pure and idempotent (running the chain twice equals running it
 * once), operates on the RAW object (pre-Zod) and follows the rules in
 * `migrate-to-next-alpha.md`. Unlike `MIGRATIONS`, the chain runs unconditionally:
 * `CURRENT_RESOURCE_VERSION` stays 1 during alpha, so files are not version-gated.
 */

import { migration_v1_to_v2 } from './migration-v1-to-v2';
import type { RawResourceJson } from './types';

type Obj = Record<string, unknown>;
export type Codemod = { name: string; run: (raw: Obj) => Obj };
type Transform = Codemod;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Drop keys whose value is `undefined`. */
const compact = (o: Obj): Obj => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** Remove `keys` from `o`; returns the same object when none were present. */
const omit = (o: Obj, keys: readonly string[]): Obj =>
  keys.some((k) => k in o) ? Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k))) : o;

const columnsOf = (raw: Obj): Obj => (isObj(raw['columns']) ? raw['columns'] : {});

/** Map every column through `fn`; returns `raw` untouched when there is no columns map. */
const mapColumns = (raw: Obj, fn: (col: Obj, id: string) => Obj): Obj => {
  if (!isObj(raw['columns'])) return raw;
  return {
    ...raw,
    columns: Object.fromEntries(
      Object.entries(raw['columns']).map(([id, col]) => [id, isObj(col) ? fn(col, id) : col]),
    ),
  };
};

/** Set `fieldInput` (and its `options`), deleting either when it ends up empty. */
const withFieldInput = (col: Obj, fi: Obj | undefined): Obj => {
  const { fieldInput: _old, ...rest } = col;
  if (!fi) return rest;
  let next = fi;
  if (isObj(next['options']) && Object.keys(next['options']).length === 0) next = omit(next, ['options']);
  return Object.keys(next).length ? { ...rest, fieldInput: next } : rest;
};

// ── Operations helpers ────────────────────────────────────────────────

/**
 * Merge ids into `operations.<op>.<key>` (deduped, existing first). A disabled op
 * (`false`, or an unset `findAll`/`findOne` on a custom resource) is left alone.
 */
const mergeIntoOperation = (raw: Obj, op: string, key: string, values: unknown[], replace = false): Obj => {
  if (!values.length) return raw;
  const ops = isObj(raw['operations']) ? raw['operations'] : {};
  const current = ops[op];
  if ((current ?? raw['kind'] !== 'custom') === false) return raw;
  const entry = isObj(current) ? current : {};
  const existing = Array.isArray(entry[key]) ? (entry[key] as unknown[]) : [];
  if (replace && existing.length) return raw;
  const seen = new Set(existing.map((v) => JSON.stringify(v)));
  const merged = [...existing, ...values.filter((v) => !seen.has(JSON.stringify(v)))];
  return { ...raw, operations: { ...ops, [op]: { ...entry, [key]: merged } } };
};

// ── Root transforms ───────────────────────────────────────────────────

/** Root `id` is removed; keep the URL when it differed from `name`. */
const rootId: Transform = {
  name: 'remove root id',
  run: (raw) => {
    if (!('id' in raw)) return raw;
    const { id, ...rest } = raw;
    if (typeof id === 'string' && id !== raw['name'] && rest['route'] === undefined) return { ...rest, route: id };
    return rest;
  },
};

/** Root `tag` → `openapi.tag` (only when `openapi` is absent). */
const rootTag: Transform = {
  name: 'tag → openapi.tag',
  run: (raw) => {
    if (raw['tag'] === undefined || raw['openapi'] !== undefined) return raw;
    const { tag, ...rest } = raw;
    return { ...rest, openapi: { tag } };
  },
};

/** Root `model`/`table`/`database`/`idType` and `source.table`/`source.database` → `source.*`. */
const rootSource: Transform = {
  name: 'model/table/database/idType → source.*',
  run: (raw) => {
    const source = isObj(raw['source']) ? raw['source'] : {};
    const moved: Obj = compact({
      model: raw['model'],
      dbTable: raw['table'] ?? source['table'],
      datasource: raw['database'] ?? source['database'],
      idType: raw['idType'],
    });
    if (!Object.keys(moved).length) return raw;
    const rest = omit(raw, ['model', 'table', 'database', 'idType']);
    // Existing `source.*` wins over the legacy value.
    return { ...rest, source: { ...moved, ...omit(source, ['table', 'database']) } };
  },
};

/** Root `display`/`modalSize` → `layout.form.container` / `layout.view.container`. */
const rootDisplay: Transform = {
  name: 'display/modalSize → layout.<form|view>.container',
  run: (raw) => {
    if (raw['display'] === undefined && raw['modalSize'] === undefined) return raw;
    const container = compact({ mode: raw['display'], size: raw['modalSize'] });
    const layout = isObj(raw['layout']) ? { ...raw['layout'] } : {};
    for (const ctx of ['form', 'view']) {
      const node = isObj(layout[ctx]) ? layout[ctx] : {};
      if (node['container'] === undefined) layout[ctx] = { ...node, container };
    }
    return { ...omit(raw, ['display', 'modalSize']), layout };
  },
};

/** Root `include` → `operations.findAll.include` + `operations.findOne.include`. */
const rootInclude: Transform = {
  name: 'include → operations.findAll/findOne.include',
  run: (raw) => {
    if (!Array.isArray(raw['include'])) return omit(raw, ['include']);
    const include = raw['include'] as unknown[];
    let out = omit(raw, ['include']);
    out = mergeIntoOperation(out, 'findAll', 'include', include, true);
    return mergeIntoOperation(out, 'findOne', 'include', include, true);
  },
};

/** Root `calculatedColumns` → `columns[id].computed`. */
const rootCalculatedColumns: Transform = {
  name: 'calculatedColumns → columns[id].computed',
  run: (raw) => {
    if (!Array.isArray(raw['calculatedColumns'])) return raw;
    const columns = { ...columnsOf(raw) };
    for (const entry of raw['calculatedColumns'] as unknown[]) {
      if (!isObj(entry) || typeof entry['id'] !== 'string') continue;
      const existing = isObj(columns[entry['id']]) ? (columns[entry['id']] as Obj) : {};
      columns[entry['id']] = {
        ...compact({ label: entry['label'], position: entry['position'] }),
        ...existing,
        computed: compact({ sql: entry['sqlExpression'], type: entry['type'] }),
      };
    }
    return { ...omit(raw, ['calculatedColumns']), columns };
  },
};

/** Column `showInLookup: true` → resource `lookup.labels`. */
const showInLookup: Transform = {
  name: 'showInLookup → lookup.labels',
  run: (raw) => {
    const ids = Object.entries(columnsOf(raw))
      .filter(([, c]) => isObj(c) && c['showInLookup'] === true)
      .map(([id]) => id);
    const hasFlag = Object.values(columnsOf(raw)).some((c) => isObj(c) && 'showInLookup' in c);
    if (!hasFlag) return raw;
    const out = mapColumns(raw, (col) => omit(col, ['showInLookup']));
    if (!ids.length) return out;
    const lookup = isObj(raw['lookup']) ? raw['lookup'] : {};
    const labels = Array.isArray(lookup['labels']) ? (lookup['labels'] as string[]) : [];
    return {
      ...out,
      lookup: { ...lookup, labels: [...labels, ...ids.filter((id) => !labels.includes(id))], separator: lookup['separator'] ?? ' ' },
    };
  },
};

// ── Column transforms ─────────────────────────────────────────────────

const COLUMN_KEY_ALIASES: Record<string, string> = { createable: 'creatable', updateable: 'updatable' };
const FIELD_INPUT_TYPE_ALIASES: Record<string, string> = {
  Integer: 'integer',
  mutliSelect: 'multiSelect',
  'date-range': 'dateRange',
};

/** `createable`/`updateable` and old field-input type spellings. */
const spelling: Transform = {
  name: 'spelling fixes (creatable, updatable, field-input types)',
  run: (raw) =>
    mapColumns(raw, (col) => {
      let out = col;
      for (const [old, next] of Object.entries(COLUMN_KEY_ALIASES)) {
        if (!(old in out)) continue;
        const { [old]: value, ...rest } = out;
        out = next in rest ? rest : { ...rest, [next]: value };
      }
      const fi = out['fieldInput'];
      if (!isObj(fi)) return out;
      const alias = (v: unknown) => (typeof v === 'string' ? (FIELD_INPUT_TYPE_ALIASES[v] ?? v) : v);
      const nextFi = { ...fi };
      if ('type' in fi) nextFi['type'] = alias(fi['type']);
      if ('format' in fi) nextFi['format'] = alias(fi['format']);
      return { ...out, fieldInput: nextFi };
    }),
};

const RELATION_FI_KEYS = ['resource', 'relationType', 'foreignKey', 'relation', 'format'];
const RELATION_OPTION_KEYS = ['sort', 'sortDir', 'resource', 'displayKey'];

/** `fieldInput.{resource,relationType,foreignKey,relation,options.sort…}` → column `relation`. */
const relation: Transform = {
  name: 'fieldInput relation keys → relation',
  run: (raw) =>
    mapColumns(raw, (col) => {
      const fi = col['fieldInput'];
      // Same rule as the compiler: `resource` next to a widget `type` (e.g. autocomplete) is a widget option.
      const isRelation = isObj(fi) && (fi['format'] === 'relation' || (fi['resource'] !== undefined && !fi['format'] && !fi['type']));
      if (!isObj(fi) || !isRelation) return col;
      const options = isObj(fi['options']) ? fi['options'] : {};
      let out = col;
      if (out['relation'] === undefined) {
        out = {
          ...out,
          relation: compact({
            resource: fi['resource'] ?? options['resource'],
            type: fi['relationType'],
            foreignKey: fi['foreignKey'],
            prismaField: fi['relation'],
            sort: options['sort'],
            sortDir: options['sortDir'],
          }),
        };
      }
      if (options['displayKey'] !== undefined && out['displayKey'] === undefined) {
        out = { ...out, displayKey: options['displayKey'] };
      }
      const nextFi = omit(fi, RELATION_FI_KEYS);
      return withFieldInput(out, isObj(fi['options']) ? { ...nextFi, options: omit(options, RELATION_OPTION_KEYS) } : nextFi);
    }),
};

/** `fieldInput.format` → `fieldInput.type` (when `type` is unset), then drop `format`. */
const format: Transform = {
  name: 'fieldInput.format → fieldInput.type',
  run: (raw) =>
    mapColumns(raw, (col) => {
      const fi = col['fieldInput'];
      if (!isObj(fi) || !('format' in fi) || fi['format'] === 'relation') return col;
      const { format: value, ...rest } = fi;
      return withFieldInput(col, rest['type'] === undefined ? { ...rest, type: value } : rest);
    }),
};

/** `fieldInput.detail.controls` → `fieldInput.detail.items`. */
const detailControls: Transform = {
  name: 'fieldInput.detail.controls → items',
  run: (raw) =>
    mapColumns(raw, (col) => {
      const fi = col['fieldInput'];
      const detail = isObj(fi) ? fi['detail'] : undefined;
      if (!isObj(fi) || !isObj(detail) || !('controls' in detail)) return col;
      const { controls, ...rest } = detail;
      const items = rest['items'] ?? controls;
      return { ...col, fieldInput: { ...fi, detail: { ...rest, items } } };
    }),
};

/** `fieldView` / `columnType` have no replacement. */
const deadFields: Transform = {
  name: 'remove fieldView/columnType',
  run: (raw) => mapColumns(raw, (col) => omit(col, ['fieldView', 'columnType'])),
};

// ── Layout transforms ─────────────────────────────────────────────────

/** `controls` → `items`, `actions` → `rowActions`, table settings → inner table node. */
const layoutNodes: Transform = {
  name: 'layout controls → items, actions → rowActions',
  run: (raw) => migration_v1_to_v2.migrate(raw),
};

/** Find the table node of `layout.table` (the wrapper itself, or its inner `type: "table"` item). */
const tableNodeOf = (table: Obj): Obj => {
  if (!table['type'] || table['type'] === 'table') return table;
  const inner = Array.isArray(table['items']) ? (table['items'] as unknown[]).find((i) => isObj(i) && i['type'] === 'table') : undefined;
  return isObj(inner) ? inner : table;
};

/** Replace the table node inside `layout.table` (keeps a wrapper). */
const replaceTableNode = (table: Obj, node: Obj): Obj => {
  const current = tableNodeOf(table);
  if (current === table) return node;
  return { ...table, items: (table['items'] as unknown[]).map((i) => (i === current ? node : i)) };
};

/** `layout.table.searchFields` / `filterFields` → `operations.findAll.search` / `filter`. */
const tableQueryFields: Transform = {
  name: 'layout.table searchFields/filterFields → operations.findAll',
  run: (raw) => {
    const layout = raw['layout'];
    if (!isObj(layout) || !isObj(layout['table'])) return raw;
    const node = tableNodeOf(layout['table']);
    if (!('searchFields' in node) && !('filterFields' in node)) return raw;
    const { searchFields, filterFields, ...rest } = node;
    let out: Obj = { ...raw, layout: { ...layout, table: replaceTableNode(layout['table'], rest) } };
    out = mergeIntoOperation(out, 'findAll', 'search', Array.isArray(searchFields) ? searchFields : []);
    return mergeIntoOperation(out, 'findAll', 'filter', Array.isArray(filterFields) ? filterFields : []);
  },
};

const LEGACY_TABLE_KEYS = ['sortable', 'defaultSort', 'showWhen', 'hideWhen', 'disabledWhen'];

/**
 * Column `searchable`/`filterable` → `operations.findAll`, and `sortable`/`defaultSort`/
 * `showWhen`/`hideWhen`/`disabledWhen` → table items. Mirrors the loader's alpha lift
 * exactly so the compiled result stays the same: any flag materialises `layout.table`,
 * flagged columns not yet listed are appended, flags on listed columns were ignored.
 */
const legacyTableFlags: Transform = {
  name: 'column table flags → layout.table / operations.findAll',
  run: (raw) => {
    const cols = Object.entries(columnsOf(raw)).filter((e): e is [string, Obj] => isObj(e[1]));
    if (!cols.some(([, c]) => ['searchable', 'filterable', ...LEGACY_TABLE_KEYS].some((k) => k in c))) return raw;
    const search = cols.filter(([, c]) => c['searchable']).map(([id]) => id);
    const filter = cols.filter(([, c]) => c['filterable']).map(([id]) => id);
    const overrides = cols
      .map(([id, c]) => ({ id, ...compact(Object.fromEntries(LEGACY_TABLE_KEYS.map((k) => [k, c[k] ?? undefined]))) }))
      .filter((o) => Object.keys(o).length > 1);

    let out = mapColumns(raw, (col) => omit(col, ['searchable', 'filterable', ...LEGACY_TABLE_KEYS]));
    if (overrides.length || search.length || filter.length) {
      const layout: Obj = isObj(out['layout']) ? { ...out['layout'] } : {};
      const table = isObj(layout['table']) ? layout['table'] : {};
      const node = tableNodeOf(table);
      const items = Array.isArray(node['items']) ? (node['items'] as unknown[]) : [];
      const listed = new Set(items.map((i) => (typeof i === 'string' ? i : isObj(i) ? i['id'] : undefined)));
      const added = overrides.filter((o) => !listed.has(o.id));
      layout['table'] = replaceTableNode(table, added.length ? { ...node, items: [...items, ...added] } : node);
      out = { ...out, layout };
    }
    out = mergeIntoOperation(out, 'findAll', 'search', search);
    return mergeIntoOperation(out, 'findAll', 'filter', filter);
  },
};

// ── Column presentation → layout items ────────────────────────────────

type Ctx = 'form' | 'view' | 'table';
const CONTEXTS: Ctx[] = ['form', 'view', 'table'];
const HIDDEN: Record<Ctx, string> = { form: 'hiddenInForm', view: 'hiddenInView', table: 'hiddenInTable' };
const SIZE_PROPS = ['colspan', 'rowspan', 'width'];
const FLAG_PROPS = ['hideLabel', 'readonly'];
const PRESENTATION_COLUMN_KEYS = ['position', 'hideLabel', 'fieldTable'];
const PRESENTATION_OPTION_KEYS = [...SIZE_PROPS, ...FLAG_PROPS, 'label'];

const positionOf = (col: Obj): unknown => col['position'] ?? (isObj(col['fieldInput']) ? col['fieldInput']['position'] : undefined);

/** Item props a column carried for one context. */
const propsFor = (col: Obj, ctx: Ctx): Obj => {
  const options = isObj(col['fieldInput']) && isObj(col['fieldInput']['options']) ? col['fieldInput']['options'] : {};
  if (ctx === 'table') {
    const fieldTable = isObj(col['fieldTable']) ? col['fieldTable'] : {};
    return compact({
      type: fieldTable['type'],
      options: fieldTable['options'],
    });
  }
  return compact({
    colspan: options['colspan'],
    rowspan: options['rowspan'],
    width: options['width'],
    hideLabel: col['hideLabel'] ?? options['hideLabel'],
    readonly: options['readonly'],
  });
};

/** Field ids referenced by a layout node (form/view: recursive; table: the table node). */
const fieldIdsOf = (node: Obj, ctx: Ctx): string[] => {
  const items = Array.isArray((ctx === 'table' ? tableNodeOf(node) : node)['items'])
    ? ((ctx === 'table' ? tableNodeOf(node) : node)['items'] as unknown[])
    : [];
  return items.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (!isObj(item) || 'component' in item) return [];
    if (typeof item['id'] === 'string') return [item['id']];
    return ctx === 'table' ? [] : fieldIdsOf(item, ctx);
  });
};

/** Apply column props onto the items of an existing layout node. */
const patchItems = (items: unknown[], props: Record<string, Obj>, ctx: Ctx): unknown[] =>
  items.map((item) => {
    const id = typeof item === 'string' ? item : isObj(item) ? item['id'] : undefined;
    if (typeof id === 'string') {
      const p = props[id];
      if (!p || !Object.keys(p).length) return item;
      if (!isObj(item)) return { id, ...p };
      // Object items already defaulted colspan/rowspan/width; only fill unset flags.
      const fill = omit(p, SIZE_PROPS);
      return { ...item, ...Object.fromEntries(Object.entries(fill).filter(([k]) => item[k] === undefined)) };
    }
    if (ctx !== 'table' && isObj(item) && Array.isArray(item['items']) && !('component' in item)) {
      return { ...item, items: patchItems(item['items'] as unknown[], props, ctx) };
    }
    return item;
  });

/**
 * Column presentation (`position`, `hideLabel`, `fieldInput.position`,
 * `fieldInput.options.{colspan,rowspan,width,hideLabel,readonly,label}`) and `fieldTable`
 * move to `layout.<ctx>.items`, keeping the rendered result the same.
 */
const presentation: Transform = {
  name: 'column presentation → layout items',
  run: (raw) => {
    const columns = Object.entries(columnsOf(raw)).filter((e): e is [string, Obj] => isObj(e[1]));
    const touched = columns.some(([, c]) => {
      const fi = isObj(c['fieldInput']) ? c['fieldInput'] : {};
      const options = isObj(fi['options']) ? fi['options'] : {};
      return PRESENTATION_COLUMN_KEYS.some((k) => k in c) || 'position' in fi || PRESENTATION_OPTION_KEYS.some((k) => k in options);
    });
    if (!touched) return raw;

    const layout: Obj = isObj(raw['layout']) ? { ...raw['layout'] } : {};
    for (const ctx of CONTEXTS) {
      const visible = columns.filter(([, c]) => !c[HIDDEN[ctx]]);
      const props = Object.fromEntries(visible.map(([id, c]) => [id, propsFor(c, ctx)]));
      const hasProps = Object.values(props).some((p) => Object.keys(p).length);
      const node = isObj(layout[ctx]) ? layout[ctx] : undefined;

      if (node && fieldIdsOf(node, ctx).length) {
        // Existing layout: positions are already ignored; carry props onto items.
        if (!hasProps) continue;
        if (ctx === 'table') {
          const tableNode = tableNodeOf(node);
          const items = Array.isArray(tableNode['items']) ? (tableNode['items'] as unknown[]) : [];
          const listed = new Set(fieldIdsOf(node, ctx));
          // `fieldTable` on an unlisted column creates its entry.
          const added = Object.entries(props)
            .filter(([id, p]) => !listed.has(id) && Object.keys(p).length)
            .map(([id, p]) => ({ id, ...p }));
          layout[ctx] = replaceTableNode(node, { ...tableNode, items: [...patchItems(items, props, ctx), ...added] });
        } else {
          layout[ctx] = { ...node, items: patchItems(node['items'] as unknown[], props, ctx) };
        }
        continue;
      }

      // No layout for this context: only add one when the order or props would change.
      const ordered = visible
        .map(([id, c], index) => ({ id, key: typeof positionOf(c) === 'number' ? (positionOf(c) as number) : index, index }))
        .sort((a, b) => a.key - b.key || a.index - b.index)
        .map((e) => e.id);
      const reordered = ordered.some((id, i) => id !== visible[i][0]);
      if (!reordered && !hasProps) continue;
      const items = ordered.map((id) => (Object.keys(props[id]).length ? { id, ...props[id] } : id));
      layout[ctx] =
        ctx === 'table' && !node
          ? // A new explicit table layout otherwise defaults to row-click → view and 20/50/100.
            { items, rowClick: 'none', pageSizes: [10, 20, 50, 100] }
          : { ...(node ?? {}), items };
    }

    const out = mapColumns(raw, (col) => {
      const next = omit(col, PRESENTATION_COLUMN_KEYS);
      const fi = next['fieldInput'];
      if (!isObj(fi)) return next;
      const options = isObj(fi['options']) ? omit(fi['options'], PRESENTATION_OPTION_KEYS) : undefined;
      const nextFi = omit(fi, ['position']);
      return withFieldInput(next, options ? { ...nextFi, options } : nextFi);
    });
    return Object.keys(layout).length ? { ...out, layout } : out;
  },
};

// ── Chains ────────────────────────────────────────────────────────────

/** Layout-node transforms only (`crouton migrate layout`). */
export const LAYOUT_CODEMODS: Transform[] = [layoutNodes, tableQueryFields];

/** Every transform (`crouton migrate resources`). Order matters: roots and columns before layout. */
export const RESOURCE_CODEMODS: Transform[] = [
  rootId,
  rootTag,
  rootSource,
  rootDisplay,
  rootInclude,
  rootCalculatedColumns,
  showInLookup,
  spelling,
  relation,
  format,
  detailControls,
  deadFields,
  ...LAYOUT_CODEMODS,
  legacyTableFlags,
  presentation,
];

export interface CodemodResult {
  raw: RawResourceJson;
  /** Names of the transforms that changed something, in order. */
  applied: string[];
}

/** JSON with object keys sorted, for order-insensitive comparison. */
const stableJson = (v: unknown): string =>
  JSON.stringify(v, (_k, val: unknown) =>
    isObj(val) ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, val[k]])) : val,
  );

/** Run a codemod chain; reports which transforms changed the object. */
export const runCodemods = (raw: RawResourceJson, chain: Transform[] = RESOURCE_CODEMODS): CodemodResult => {
  const applied: string[] = [];
  let current = raw;
  for (const t of chain) {
    const next = t.run(current);
    // Key order alone is not a change — keep the input so re-runs never churn the file.
    if (stableJson(next) === stableJson(current)) continue;
    applied.push(t.name);
    current = next;
  }
  return { raw: current, applied };
};
