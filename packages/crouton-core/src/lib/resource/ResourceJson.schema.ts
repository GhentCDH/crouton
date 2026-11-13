import { z } from 'zod';

import { JsonOperationsSchema } from '../data-source/Operations.schema';
import { SecuritySchema } from '../data-source/Security.schema';
import { LayoutSchema } from '../layout/schema/Layout.schema';
import { labelFromId } from '../schema/label.helper';
import { type JsonColumn, JsonColumnSchema } from './Column';
import { parseFieldInputOptions } from './FieldInput.schema';
import { ParentRefSchema } from './ParentRef.schema';
import { ResourceKindSchema } from './ResourceKind';
import { SidebarSchema } from './Sidebar.schema';
import { getResourceExtensions, getResourceExtensionsStamp } from './extensions';
import { BASELINE_RESOURCE_VERSION } from './version';

// ── Removed-key registry ─────────────────────────────────────────────
// Keys that were removed from the root schema and where they moved to.
const ROOT_REMOVED_KEYS: Record<string, string> = {
  display:
    '\'display\' moved to layout.form.container / layout.view.container (run crouton migrate)',
  modalSize:
    '\'modalSize\' moved to layout.form.container.size (run crouton migrate)',
  include:
    '\'include\' moved to operations.findAll.include / operations.findOne.include (run crouton migrate)',
  model: '\'model\' moved to source.model (run crouton migrate)',
  table: '\'table\' moved to source.dbTable (run crouton migrate)',
  database: '\'database\' moved to source.datasource (run crouton migrate)',
  idType: '\'idType\' moved to source.idType (run crouton migrate)',
  calculatedColumns:
    '\'calculatedColumns\' moved to columns[id].computed (run crouton migrate)',
  id: '\'id\' was removed — the resource id is always "name" (run crouton migrate)',
};

// ── Removed `source` keys ─────────────────────────────────────────────
// Keys that were removed from the `source` object and where they moved to.
// Same treatment as ROOT_REMOVED_KEYS: a file that still writes them fails
// validation instead of silently dropping the table name / datasource.
const SOURCE_REMOVED_KEYS: Record<string, string> = {
  table: '\'source.table\' moved to source.dbTable (run crouton migrate)',
  database:
    '\'source.database\' moved to source.datasource (run crouton migrate)',
};

// ── Shared primitives ────────────────────────────────────────────────

const JsonColumnsMapSchema = z.record(
  z.string(),
  JsonColumnSchema.omit({ id: true }).strict(),
); // map form — key becomes `id`; unknown column keys fail (typo protection)
export type JsonColumnsMap = z.infer<typeof JsonColumnsMapSchema>;
const ColumnsSchema = JsonColumnsMapSchema;

// ── Display / sidebar ────────────────────────────────────────────────

/** Normalise `columns` from either array or object-map form. */
const normalizeColumns = (
  columns: JsonColumnsMap | undefined,
): JsonColumn[] | undefined => {
  if (!columns) return undefined;
  const raw: JsonColumn[] = Array.isArray(columns)
    ? columns
    : Object.entries(columns).map(([id, col]) => ({ id, ...col }));
  return raw.map((col) => ({
    ...col,
    label: col.label ?? labelFromId(col.id),
  }));
};

// ── Top-level resource.json ──────────────────────────────────────────

export const ResourceJsonShape = z.object({
  /**
   * URL of the generated JSON Schema, for editor autocomplete/validation. Declared so the
   * key is *allowed* (not stripped, and not flagged by the very schema it points at).
   * Ignored at runtime.
   */
  $schema: z
    .string()
    .optional()
    .describe(
      'URL of the generated JSON Schema for editor autocomplete and validation. Ignored at runtime.',
    ),
  schemaVersion: z
    .number()
    .int()
    .max(1)
    .positive()
    .optional()
    .describe(
      'resource.json shape version. Omit to use the baseline. Auto-migrated toward CURRENT_RESOURCE_VERSION on load in the dev environment.',
    ),
  draft: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When true, the resource is present in the repo but NOT loaded or served. Use for work-in-progress resources.',
    ),
  /**
   * Where the data comes from. `prisma` (the default) is backed by a Prisma
   * model plus a `schema.ts`; `custom` is configuration only and the developer
   * supplies a `repository.ts`. See `./ResourceKind`.
   */
  kind: ResourceKindSchema,
  name: z
    .string()
    .describe(
      'Unique resource identifier. Used as the resource id, the frontend form id and the default route.',
    ),
  route: z
    .string()
    .optional()
    .describe(
      'URL segment for generated API endpoints. Defaults to "name" when omitted.',
    ),
  tag: z
    .string()
    .optional()
    .default('Crouton')
    .describe(
      'OpenAPI tag grouping for generated endpoints. Defaults to "Crouton". Prefer openapi.tag for new resources.',
    ),
  openapi: z
    .object({
      tag: z
        .string()
        .optional()
        .describe('OpenAPI tag for grouping generated endpoints.'),
      description: z
        .string()
        .optional()
        .describe(
          'Description of the OpenAPI tag. Added to the Swagger document by applyResourceTagDescriptions() from @ghentcdh/crouton-api.',
        ),
    })
    .optional()
    .describe(
      'OpenAPI metadata for generated endpoints. Supersedes the root-level tag field.',
    ),
  title: z
    .string()
    .optional()
    .describe(
      'Human-readable title shown in the UI sidebar and page headers. Defaults to a title-cased version of "name".',
    ),
  /**
   * Mount this resource under a parent route instead of at the top level —
   * see `./ParentRef.schema`. Only valid on a `kind: "custom"` resource.
   */
  parent: ParentRefSchema.optional().describe(
    'Mount this resource under a parent route instead of at the top level. Only valid on kind:"custom" resources. See ParentRef for the full config.',
  ),
  sidebar: SidebarSchema.default(SidebarSchema.parse({})).describe(
    'Sidebar visibility and ordering config. Default: shown, alphabetically ordered, ungrouped.',
  ),
  security: SecuritySchema.optional().describe(
    'Global security block applied to every operation unless overridden per-operation. Use per-operation security in the operations block for finer control.',
  ),
  operations: JsonOperationsSchema.optional().describe(
    'CRUD operation flags. Defaults: all true for "prisma" resources, all false for "custom" resources.',
  ),
  columns: ColumnsSchema.optional()
    .default(ColumnsSchema.parse({}))
    .describe(
      'Column definitions as an id-keyed map. Each key becomes the column id. Omit for a columnless resource.',
    ),
  source: z
    .object({
      model: z.string().optional().describe('Prisma model name.'),
      dbTable: z.string().optional().describe('Database table name override.'),
      datasource: z.string().optional().describe('Datasource name.'),
      idType: z
        .enum(['string', 'number'])
        .optional()
        .describe('Primary key type.'),
    })
    .optional()
    .describe(
      'Where the data comes from: Prisma model, table, datasource and primary-key type.',
    ),
  lookup: z
    .object({
      labels: z
        .array(z.string())
        .describe('Ordered display fields for relation dropdowns.'),
      separator: z
        .string()
        .optional()
        .default(' ')
        .describe('String placed between the label fields. Default: a single space.'),
    })
    .optional()
    .describe('How this resource is labelled in other resources\' dropdowns.'),
  layout: LayoutSchema.optional().describe(
    'Explicit layout for generated views (form, view, table). When absent, source-order grid is used.',
  ),
});

/**
 * Per-kind rules that a plain `z.object` cannot express.
 *
 * Implemented as a refinement rather than a `z.discriminatedUnion` on purpose:
 * `scripts/gen-resource-schema.mjs` runs `z.toJSONSchema(ResourceJsonShape)`
 * and needs a `z.object`, and a defaulted discriminator does not survive the
 * union. The generated JSON Schema is therefore permissive about these rules
 * while the loader enforces them.
 */
export const refineByKind = (
  obj: z.infer<typeof ResourceJsonShape>,
  ctx: z.RefinementCtx,
): void => {
  if (obj.kind === 'custom') {
    if (obj.source?.model !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['source', 'model'],
        message:
          'A custom resource has no Prisma model. Remove "source.model" — data access comes from repository.ts.',
      });
    }
    for (const [id, col] of Object.entries(obj.columns ?? {})) {
      // A relation or autocomplete column's shape comes from the referenced
      // resource, not from this column.
      if (
        col.relation !== undefined ||
        col.fieldInput?.format === 'relation' ||
        col.fieldInput?.type === 'autocomplete'
      ) {
        continue;
      }
      if (col.type === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['columns', id, 'type'],
          message: `Column "${id}" needs a "type": a custom resource has no schema.ts, so its JSON schema is built from the column types.`,
        });
      }
    }
    if (obj.parent && obj.parent.param === 'id') {
      ctx.addIssue({
        code: 'custom',
        path: ['parent', 'param'],
        message:
          'parent.param cannot be "id" — that is the child\'s own id in /:id routes. Use something like "groupId".',
      });
    }
  } else if (obj.parent !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['parent'],
      message:
        '"parent" is only supported on a custom resource. A prisma resource is nested by declaring a relation column on its parent.',
    });
  }
  // "model required for prisma kind" moved to the Prisma adapter at load time —
  // a resource on a custom-adapter datasource may have no model and is still valid.
  //
  // `enum` + `fieldInput.options.values` is allowed: a local `values` list restricts the
  // shared enum for this screen, with labels resolved from the enum registry at load time
  // (see `compile/enum-registry.ts` → `applyLocalEnumRestriction`). Unknown values warn
  // there rather than failing schema validation.
};

// ── Phase 3: layout validation ───────────────────────────────────────────

/** Collect all field ids (recursively) from a parsed FormLayoutNode tree. */
const collectFormLayoutIds = (node: { items?: unknown[] }): string[] => {
  const ids: string[] = [];
  for (const item of node.items ?? []) {
    if (typeof item === 'string') {
      ids.push(item);
    } else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      if ('id' in obj && typeof obj['id'] === 'string') {
        ids.push(obj['id']);
      } else if (!('component' in obj) && 'items' in obj) {
        ids.push(...collectFormLayoutIds(obj as { items?: unknown[] }));
      }
    }
  }
  return ids;
};

/** Depth-first: find the table node in a parsed TableLayoutRoot. */
const findParsedTableNode = (
  node: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const t = node['type'];
  if ((!t || t === 'table') && !('component' in node)) return node;
  const items = node['items'];
  if (!Array.isArray(items)) return undefined;
  for (const item of items) {
    if (item && typeof item === 'object') {
      const found = findParsedTableNode(item as Record<string, unknown>);
      if (found) return found;
    }
  }
  return undefined;
};

/** P3, P4, P5: validate layout field ids against known columns. */
const refineLayout = (
  obj: z.infer<typeof ResourceJsonShape>,
  ctx: z.RefinementCtx,
): void => {
  const allIds = new Set(Object.keys(obj.columns ?? {}));

  // Validate operations.findAll.search / filter independently of layout
  const findAll = obj.operations?.findAll;
  if (findAll && typeof findAll === 'object' && !('uri' in findAll)) {
    for (const key of ['search', 'filter'] as const) {
      for (const id of findAll[key] ?? []) {
        if (!allIds.has(id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['operations', 'findAll', key],
            message: `Unknown column id "${id}" in operations.findAll.${key}.`,
          });
        }
      }
    }
  }

  const layout = obj.layout;
  if (!layout) return;

  const validateIds = (ids: string[], path: string[], label: string): void => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (!allIds.has(id)) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `Unknown column id "${id}" in layout.${label} — not found in columns.`,
        });
      }
      if (seen.has(id)) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `Duplicate column id "${id}" in layout.${label} — each id may appear only once per context.`,
        });
      }
      seen.add(id);
    }
  };

  if (layout.form) {
    validateIds(collectFormLayoutIds(layout.form), ['layout', 'form'], 'form');
  }
  if (layout.view) {
    validateIds(collectFormLayoutIds(layout.view), ['layout', 'view'], 'view');
  }
  if (layout.table) {
    const tableNode = findParsedTableNode(
      layout.table as Record<string, unknown>,
    );
    if (tableNode) {
      const ids = ((tableNode['items'] as unknown[] | undefined) ?? [])
        .filter((item) => !(item as Record<string, unknown>)?.['component'])
        .map((item) =>
          typeof item === 'string' ? item : ((item as Record<string, unknown>)?.['id'] as string),
        )
        .filter(Boolean);
      validateIds(ids, ['layout', 'table'], 'table');
    }
  }
};

/**
 * Find the table node within a raw (unparsed) layout object.
 * In a flat table layout, the table IS the layout.table value.
 * In a wrapper layout, the table node is the descendant with `type: "table"`.
 * Returns the table object and its parent container for mutation.
 */
const getOrCreateTableNode = (
  layout: Record<string, unknown>,
): Record<string, unknown> => {
  const table = (layout['table'] as Record<string, unknown> | undefined) ?? {};
  if (!table['type'] || table['type'] === 'table') return table;
  // Wrapper layout — find the table sub-node
  const items = table['items'] as Record<string, unknown>[] | undefined;
  if (items) {
    const inner = items.find((i) => i?.['type'] === 'table');
    if (inner) return inner;
  }
  return table;
};

/**
 * Return an updated copy of `layout` where the table node (possibly nested inside a
 * wrapper) is replaced by `node`.  When `layout.table` is a wrapper, the inner
 * `{ type: "table" }` sub-node is replaced and the wrapper structure is preserved.
 * When `layout.table` does not exist yet, it is created from `node`.
 */
const replaceTableNodeInLayout = (
  layout: Record<string, unknown>,
  node: Record<string, unknown>,
): Record<string, unknown> => {
  const outerTable = layout['table'] as Record<string, unknown> | undefined;
  if (!outerTable || getOrCreateTableNode(layout) === outerTable)
    return { ...layout, table: node };
  const outerItems = (outerTable['items'] as Record<string, unknown>[]) ?? [];
  const idx = outerItems.findIndex((i) => i?.['type'] === 'table');
  if (idx < 0) return { ...layout, table: node };
  return {
    ...layout,
    table: {
      ...outerTable,
      items: [...outerItems.slice(0, idx), node, ...outerItems.slice(idx + 1)],
    },
  };
};

/** Merge `updates` into the table node of `layout` (see `replaceTableNodeInLayout`). */
const patchTableNodeInLayout = (
  layout: Record<string, unknown>,
  updates: Record<string, unknown>,
): Record<string, unknown> =>
  replaceTableNodeInLayout(layout, {
    ...(layout['table'] ? getOrCreateTableNode(layout) : {}),
    ...updates,
  });

/**
 * Merge column ids into `operations.findAll.<key>` (deduped, existing first).
 * No-op when findAll is disabled; an unset findAll defaults to off for `custom`.
 */
const mergeIntoFindAll = (
  obj: Record<string, unknown>,
  key: 'search' | 'filter',
  fields: string[],
): Record<string, unknown> => {
  if (!fields.length) return obj;
  const kind = obj['kind'] as string | undefined;
  const ops = (obj['operations'] as Record<string, unknown> | undefined) ?? {};
  const findAll = ops['findAll'];
  if ((findAll ?? kind !== 'custom') === false) return obj;
  const findAllObj =
    typeof findAll === 'object' && findAll !== null
      ? (findAll as Record<string, unknown>)
      : undefined;
  const existing = (findAllObj?.[key] as string[] | undefined) ?? [];
  const merged = [...existing, ...fields.filter((f) => !existing.includes(f))];
  return {
    ...obj,
    operations: { ...ops, findAll: { ...findAllObj, [key]: merged } },
  };
};

/**
 * Lift `layout.table.searchFields` / `filterFields` (flat or wrapped table node)
 * into `operations.findAll.search` / `filter` and strip them from the layout.
 * Both keys are also reported as removed; the lift keeps the rest of the parse sane.
 */
const liftLayoutTableQueryFields = (
  obj: Record<string, unknown>,
): Record<string, unknown> => {
  const layout = obj['layout'] as Record<string, unknown> | undefined;
  if (!layout?.['table']) return obj;
  const node = getOrCreateTableNode(layout);
  if (!('searchFields' in node) && !('filterFields' in node)) return obj;
  const { searchFields, filterFields, ...rest } = node;
  const lifted = { ...obj, layout: replaceTableNodeInLayout(layout, rest) };
  return mergeIntoFindAll(
    mergeIntoFindAll(lifted, 'search', (searchFields as string[] | undefined) ?? []),
    'filter',
    (filterFields as string[] | undefined) ?? [],
  );
};

/**
 * Walk a raw (unparsed) layout node tree and check for removed keys.
 * Returns error descriptors that `refineByKind` can emit as Zod issues.
 */
const collectRemovedLayoutKeyErrors = (
  node: unknown,
  path: string[],
): Array<{ path: string[]; message: string }> => {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  const obj = node as Record<string, unknown>;
  const errors: Array<{ path: string[]; message: string }> = [];

  if ('controls' in obj) {
    errors.push({
      path: [...path, 'controls'],
      message: '\'controls\' was removed — use \'items\'.',
    });
  }
  if ('searchFields' in obj) {
    errors.push({
      path: [...path, 'searchFields'],
      message: '\'searchFields\' was moved to \'operations.findAll.search\'.',
    });
  }
  if ('filterFields' in obj) {
    errors.push({
      path: [...path, 'filterFields'],
      message: '\'filterFields\' was moved to \'operations.findAll.filter\'.',
    });
  }
  if ('actions' in obj && path.some((p) => p === 'table')) {
    errors.push({
      path: [...path, 'actions'],
      message: '\'actions\' was renamed to \'rowActions\'.',
    });
  }

  for (const key of ['items', 'controls']) {
    const children = obj[key];
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        errors.push(
          ...collectRemovedLayoutKeyErrors(children[i], [
            ...path,
            key,
            String(i),
          ]),
        );
      }
    }
  }

  // Also recurse into table node (searchFields / actions live there)
  for (const key of ['table', 'form', 'view']) {
    const child = obj[key];
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      errors.push(...collectRemovedLayoutKeyErrors(child, [...path, key]));
    }
  }

  return errors;
};

const MIGRATE_HINT = '(see migrate-to-next-alpha.md → "Column presentation → layout items")';
const ORDER_MOVED = `moved to the order of layout.<form|view|table>.items ${MIGRATE_HINT}`;
const ITEM_MOVED = (key: string) =>
  `moved to the layout item: layout.<form|view>.items[{ id, ${key} }] ${MIGRATE_HINT}`;
/** Column presentation keys that now live in layout items. */
const COLUMN_OPTION_REMOVED_KEYS = [
  'colspan',
  'rowspan',
  'width',
  'hideLabel',
  'readonly',
];

/**
 * Walk raw columns (map or array) for presentation keys that moved to the layout.
 * Zod would strip them silently; report them so the file gets migrated.
 */
const collectRemovedColumnKeyErrors = (
  columns: unknown,
): Array<{ path: string[]; message: string }> => {
  const entries: [string, unknown][] = Array.isArray(columns)
    ? (columns as unknown[]).map((c, i) => [String(i), c])
    : columns && typeof columns === 'object'
      ? Object.entries(columns)
      : [];
  const errors: Array<{ path: string[]; message: string }> = [];
  for (const [key, col] of entries) {
    if (!col || typeof col !== 'object') continue;
    const c = col as Record<string, unknown>;
    const base = ['columns', key];
    if ('position' in c)
      errors.push({
        path: [...base, 'position'],
        message: `'position' ${ORDER_MOVED}`,
      });
    if ('hideLabel' in c)
      errors.push({
        path: [...base, 'hideLabel'],
        message: `'hideLabel' ${ITEM_MOVED('hideLabel')}`,
      });
    const fi = c['fieldInput'];
    if (!fi || typeof fi !== 'object') continue;
    const f = fi as Record<string, unknown>;
    if ('position' in f) {
      errors.push({
        path: [...base, 'fieldInput', 'position'],
        message: `'fieldInput.position' ${ORDER_MOVED}`,
      });
    }
    const options = f['options'];
    if (!options || typeof options !== 'object') continue;
    for (const k of COLUMN_OPTION_REMOVED_KEYS) {
      if (k in options) {
        errors.push({
          path: [...base, 'fieldInput', 'options', k],
          message: `'fieldInput.options.${k}' ${ITEM_MOVED(k)}`,
        });
      }
    }
    if ('label' in options) {
      errors.push({
        path: [...base, 'fieldInput', 'options', 'label'],
        message: `'fieldInput.options.label' was removed: use the column 'label', or a layout item 'label' per context ${MIGRATE_HINT}`,
      });
    }
  }
  return errors;
};

/** Legacy column flags lifted onto the table layout item (see migrate-to-next-alpha.md). */
const LEGACY_COLUMN_CONTROL_KEYS = [
  'sortable',
  'defaultSort',
  'showWhen',
  'hideWhen',
  'disabledWhen',
] as const;
/** Column keys consumed by the preprocess (lifted or reported) before strict validation. */
const STRIPPED_COLUMN_KEYS = new Set<string>([
  ...LEGACY_COLUMN_CONTROL_KEYS,
  'searchable',
  'filterable',
  'position',
  'hideLabel',
]);

/** Old column-key spellings, rewritten before validation (alpha only — drop at v1). */
const COLUMN_KEY_ALIASES: Record<string, string> = {
  createable: 'creatable',
  updateable: 'updatable',
};
/** Old `fieldInput.type`/`format` values, rewritten before validation (alpha only). */
const FIELD_INPUT_TYPE_ALIASES: Record<string, string> = {
  Integer: 'integer',
  mutliSelect: 'multiSelect',
  'date-range': 'dateRange',
};

/** Rename alias keys; when both spellings are present the new one wins. */
const renameKeys = (
  obj: Record<string, unknown>,
  aliases: Record<string, string>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([k]) => !(aliases[k] && aliases[k] in obj))
      .map(([k, v]) => [aliases[k] ?? k, v]),
  );

/** Rewrite legacy column spellings in a raw `columns` map. */
const applyColumnAliases = (columns: unknown): unknown => {
  if (!columns || typeof columns !== 'object' || Array.isArray(columns))
    return columns;
  return Object.fromEntries(
    Object.entries(columns).map(([id, col]) => {
      if (!col || typeof col !== 'object') return [id, col];
      const out = renameKeys(col as Record<string, unknown>, COLUMN_KEY_ALIASES);
      const fi = out['fieldInput'] as Record<string, unknown> | undefined;
      if (fi && typeof fi === 'object') {
        const alias = (v: unknown) =>
          typeof v === 'string' ? (FIELD_INPUT_TYPE_ALIASES[v] ?? v) : v;
        out['fieldInput'] = {
          ...fi,
          ...('type' in fi && { type: alias(fi['type']) }),
          ...('format' in fi && { format: alias(fi['format']) }),
        };
      }
      return [id, out];
    }),
  );
};

const createResourceJsonSchema = () => {
  const ext = getResourceExtensions();
  const extShape = Object.fromEntries(
    [...ext].map(([name, schema]) => [name, schema.optional()]),
  );
  // Zod .extend() widens the inferred type; casting through a typed parameter avoids as unknown as.
  const toBaseShape = (s: unknown) => s as typeof ResourceJsonShape;
  const shape = toBaseShape(ext.size ? ResourceJsonShape.extend(extShape) : ResourceJsonShape);

  // ponytail: closure to pass raw layout errors from preprocess → superRefine without schema changes
  let _rawLayoutErrors: Array<{ path: string[]; message: string }> = [];
  let _rawRootErrors: Array<{ path: string[]; message: string }> = [];
  let _rawSourceErrors: Array<{ path: string[]; message: string }> = [];

  return z.preprocess(
    (raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
      let obj = raw as Record<string, unknown>;
      if ('columns' in obj)
        obj = { ...obj, columns: applyColumnAliases(obj['columns']) };

      // Collect errors for removed root keys before Zod strips them
      _rawRootErrors = [
        ...Object.entries(ROOT_REMOVED_KEYS)
          .filter(([k]) => k in obj)
          .map(([k, message]) => ({ path: [k], message })),
        ...collectRemovedColumnKeyErrors(obj['columns']),
      ];

      // Collect errors for removed keys before any transforms
      _rawLayoutErrors = collectRemovedLayoutKeyErrors(obj['layout'], [
        'layout',
      ]);
      _rawSourceErrors = [];

      // Collect errors for removed keys inside `source` before Zod strips them
      const sourceObj = obj['source'];
      if (
        sourceObj &&
        typeof sourceObj === 'object' &&
        !Array.isArray(sourceObj)
      ) {
        _rawSourceErrors = Object.entries(SOURCE_REMOVED_KEYS)
          .filter(([k]) => k in (sourceObj as Record<string, unknown>))
          .map(([k, message]) => ({ path: ['source', k], message }));
      }

      obj = liftLayoutTableQueryFields(obj);

      // Backward-compat: lift deprecated root actions/tableActions into layout.table.rowActions/tableActions
      const rootActions = obj['actions'] as unknown[] | undefined;
      const rootTableActions = obj['tableActions'] as unknown[] | undefined;
      if (rootActions?.length || rootTableActions?.length) {
        const layout =
          (obj['layout'] as Record<string, unknown> | undefined) ?? {};
        const tableNode = getOrCreateTableNode(layout);
        obj = {
          ...obj,
          layout: patchTableNodeInLayout(layout, {
            ...(rootActions?.length &&
              !(tableNode['rowActions'] as unknown[])?.length && {
                rowActions: rootActions,
              }),
            ...(rootTableActions?.length &&
              !(tableNode['tableActions'] as unknown[])?.length && {
                tableActions: rootTableActions,
              }),
          }),
        };
        delete (obj as Record<string, unknown>)['actions'];
        delete (obj as Record<string, unknown>)['tableActions'];
      }

      // Backward-compat: lift deprecated root layout.table.actions → rowActions
      {
        const layout = obj['layout'] as Record<string, unknown> | undefined;
        if (layout) {
          const tableNode = getOrCreateTableNode(layout);
          const { actions: oldActions, ...rest } = tableNode;
          if (
            (oldActions as unknown[] | undefined)?.length &&
            !(tableNode['rowActions'] as unknown[])?.length
          ) {
            obj = {
              ...obj,
              layout: replaceTableNodeInLayout(layout, {
                ...rest,
                rowActions: oldActions,
              }),
            };
          }
        }
      }


      // Backward-compat: lift deprecated column-level table flags into
      // layout.table items / operations.findAll, then drop them (and the
      // already-reported presentation keys) so the strict column schema
      // does not reject them a second time.
      const columns = obj['columns'] as
        Record<string, Record<string, unknown>> | undefined;
      if (columns && typeof columns === 'object' && !Array.isArray(columns)) {
        const searchFields: string[] = [];
        const filterFields: string[] = [];
        const controlOverrides: Record<string, unknown>[] = [];

        for (const [id, col] of Object.entries(columns)) {
          if (!col || typeof col !== 'object') continue;
          if (col['searchable']) searchFields.push(id);
          if (col['filterable']) filterFields.push(id);
          const ctrl = Object.fromEntries(
            LEGACY_COLUMN_CONTROL_KEYS.filter((k) => col[k] != null).map((k) => [
              k,
              col[k],
            ]),
          );
          if (Object.keys(ctrl).length) controlOverrides.push({ id, ...ctrl });
        }

        obj = {
          ...obj,
          columns: Object.fromEntries(
            Object.entries(columns).map(([id, col]) => [
              id,
              col && typeof col === 'object'
                ? Object.fromEntries(
                    Object.entries(col).filter(([k]) => !STRIPPED_COLUMN_KEYS.has(k)),
                  )
                : col,
            ]),
          ),
        };

        // Any legacy flag materialises layout.table (as before), so the table
        // node defaults (pageSize, density, …) still apply.
        if (controlOverrides.length || searchFields.length || filterFields.length) {
          const layout =
            (obj['layout'] as Record<string, unknown> | undefined) ?? {};
          const tableNode = getOrCreateTableNode(layout);
          const existingItems =
            (tableNode['items'] as Record<string, unknown>[] | undefined) ?? [];
          const existingIds = new Set(
            existingItems.map((c) =>
              typeof c === 'string' ? c : (c['id'] as string),
            ),
          );
          const added = controlOverrides.filter(
            (c) => !existingIds.has(c['id'] as string),
          );
          obj = {
            ...obj,
            layout: patchTableNodeInLayout(
              layout,
              added.length ? { items: [...existingItems, ...added] } : {},
            ),
          };
        }
        obj = mergeIntoFindAll(obj, 'search', searchFields);
        obj = mergeIntoFindAll(obj, 'filter', filterFields);
      }

      return obj;
    },
    shape
      .superRefine(refineByKind)
      .superRefine((_, ctx) => {
        for (const err of [
          ..._rawRootErrors,
          ..._rawLayoutErrors,
          ..._rawSourceErrors,
        ]) {
          ctx.addIssue({
            code: 'custom',
            path: err.path,
            message: err.message,
          });
        }
      })
      .superRefine(refineLayout)
      .transform((obj) => {
        const title = obj.title ?? labelFromId(obj.name);
        const schemaVersion = obj.schemaVersion ?? BASELINE_RESOURCE_VERSION;
        const defaultOps =
          obj.kind === 'custom'
            ? JsonOperationsSchema.parse({
                findAll: false,
                findOne: false,
                create: false,
                update: false,
                patch: false,
                delete: false,
              })
            : JsonOperationsSchema.parse({});
        return {
          title,
          ...obj,
          route: obj.route ?? obj.name,
          schemaVersion,
          columns: normalizeColumns(obj.columns)?.map((col) => {
            const out = { ...col };
            if (out.fieldInput)
              out.fieldInput = parseFieldInputOptions(out.fieldInput);
            return out;
          }),
          operations: obj.operations ?? defaultOps,
        };
      }),
  );
};

let cachedSchema:
  | { stamp: number; schema: ReturnType<typeof createResourceJsonSchema> }
  | undefined;

/**
 * The resource.json schema including all registered extensions. Cached per
 * extension-registry state: building it is expensive and parse is synchronous,
 * so the preprocess→superRefine closure state is safe to share.
 */
export const buildResourceJsonSchema = () => {
  const stamp = getResourceExtensionsStamp();
  if (cachedSchema?.stamp !== stamp)
    cachedSchema = { stamp, schema: createResourceJsonSchema() };
  return cachedSchema.schema;
};

/** Extension-free schema — built once at module load. */
export const ResourceJsonSchema = createResourceJsonSchema();

export type ResourceJson = z.infer<
  ReturnType<typeof createResourceJsonSchema>
> & {
  route: string;
};
export type ResourceJsonInput = z.input<typeof ResourceJsonShape> & {
  route: string;
};

export type ResourceConfig = ResourceJson;

/**
 * Generate a JSON Schema for resource.json that includes all currently-registered
 * extension keys. Call this after registering extensions to emit an app-specific
 * `resource.schema.json` that includes `annotation`, `context`, etc. as top-level
 * properties — enabling editor autocomplete for extension blocks.
 *
 * The core committed `resource.schema.json` is extension-agnostic (generated at
 * crouton-core build time when no extensions are registered). This helper lets
 * a consuming app emit its own schema after registering its extensions.
 */
export const generateResourceJsonSchema = (): Record<string, unknown> => {
  const ext = getResourceExtensions();
  const extShape = Object.fromEntries(
    [...ext].map(([name, schema]) => [name, schema.optional()]),
  );
  const shape = ext.size
    ? ResourceJsonShape.extend(extShape)
    : ResourceJsonShape;
  try {
    return z.toJSONSchema(shape, {
      target: 'draft-7',
      io: 'input',
      unrepresentable: 'any',
    }) as Record<string, unknown>;
  } catch {
    // ponytail: if toJSONSchema fails (recursive/record schema), fall back to the base shape.
    return z.toJSONSchema(ResourceJsonShape, {
      target: 'draft-7',
      io: 'input',
      unrepresentable: 'any',
    }) as Record<string, unknown>;
  }
};
