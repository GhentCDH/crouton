import { z } from 'zod';

import { JsonOperationsSchema } from '../data-source/Operations.schema';
import { SecuritySchema } from '../data-source/Security.schema';
import { LayoutSchema } from '../layout/schema/Layout.schema';
import { labelFromId } from '../schema/label.helper';
import { CalculatedColumnSchema } from './CalculatedColumn.schema';
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
  JsonColumnSchema.omit({ id: true }).catchall(z.unknown()),
); // map form — key becomes `id`
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
      'Unique resource identifier. Used as the frontend form id and as the default route/id when those are not explicitly set.',
    ),
  route: z
    .string()
    .optional()
    .describe(
      'URL segment for generated API endpoints. Defaults to "name" when omitted.',
    ),
  id: z
    .string()
    .optional()
    .describe(
      'Internal resource id used in frontend routing. Defaults to "name" when omitted.',
    ),
  /**
   * Prisma model name. Required when `kind` is `prisma` (enforced by the
   * refinement on `ResourceJsonSchema`), and must be absent when `kind` is
   * `custom` — there is no Prisma delegate to address.
   */
  model: z
    .string()
    .optional()
    .describe(
      'Prisma model name. Required when kind is "prisma"; must be absent when kind is "custom".',
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
        .describe('Description shown in the OpenAPI spec for this tag group.'),
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
  table: z
    .string()
    .optional()
    .describe(
      'Database table name override. Defaults to the Prisma model\'s table name.',
    ),
  idType: z
    .enum(['string', 'number'])
    .optional()
    .describe(
      'Data type of the resource\'s primary key, used to coerce :id route params. Written by codegen from the Prisma model; defaults to "string".',
    ),
  database: z
    .string()
    .optional()
    .describe(
      'Name of the datasource this resource uses. Defaults to the project\'s default datasource.',
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
  calculatedColumns: z
    .array(CalculatedColumnSchema)
    .default([])
    .describe(
      'Columns computed from raw SQL expressions. Not supported on "custom" resources.',
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
      'Where the data comes from (replaces root model/table/database/idType).',
    ),
  lookup: z
    .object({
      labels: z
        .array(z.string())
        .describe('Ordered display fields for relation dropdowns.'),
      separator: z.string().optional().default(' '),
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
    if (obj.model !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['model'],
        message:
          'A custom resource has no Prisma model. Remove "model" — data access comes from repository.ts.',
      });
    }
    if (obj.source?.model !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['source', 'model'],
        message:
          'A custom resource has no Prisma model. Remove "source.model" — data access comes from repository.ts.',
      });
    }
    if (obj.calculatedColumns?.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['calculatedColumns'],
        message:
          'calculatedColumns run raw SQL against a database table and are not supported on a custom resource. Compute the value in repository.ts instead.',
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
  const allIds = new Set([
    ...Object.keys(obj.columns ?? {}),
    ...(obj.calculatedColumns ?? []).map((c) => c.id),
  ]);

  // Validate operations.findAll.search independently of layout
  const findAll = obj.operations?.findAll;
  if (findAll && typeof findAll === 'object' && !('uri' in findAll)) {
    for (const sf of ((findAll as { search?: string[] }).search ?? [])) {
      if (!allIds.has(sf)) {
        ctx.addIssue({
          code: 'custom',
          path: ['operations', 'findAll', 'search'],
          message: `Unknown column id "${sf}" in operations.findAll.search.`,
        });
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
          message: `Unknown column id "${id}" in layout.${label} — not found in columns or calculatedColumns.`,
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

      for (const ff of (tableNode['filterFields'] as string[] | undefined) ??
        []) {
        if (!allIds.has(ff)) {
          ctx.addIssue({
            code: 'custom',
            path: ['layout', 'table', 'filterFields'],
            message: `Unknown column id "${ff}" in filterFields.`,
          });
        }
      }
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
 * Merge `searchFields` into `operations.findAll.search` (deduped, existing first).
 * No-op when findAll is disabled; an unset findAll defaults to off for `custom`.
 */
const mergeSearchFieldsIntoFindAll = (
  obj: Record<string, unknown>,
  searchFields: string[],
  kind: string | undefined,
): Record<string, unknown> => {
  if (!searchFields.length) return obj;
  const ops = (obj['operations'] as Record<string, unknown> | undefined) ?? {};
  const findAll = ops['findAll'];
  if ((findAll ?? kind !== 'custom') === false) return obj;
  const findAllObj =
    typeof findAll === 'object' && findAll !== null
      ? (findAll as Record<string, unknown>)
      : undefined;
  const existing = (findAllObj?.['search'] as string[] | undefined) ?? [];
  const search = [
    ...existing,
    ...searchFields.filter((f) => !existing.includes(f)),
  ];
  return {
    ...obj,
    operations: { ...ops, findAll: { ...findAllObj, search } },
  };
};

/**
 * Lift `layout.table.searchFields` (flat or wrapped table node) into
 * `operations.findAll.search` and strip it from the layout. Runs before kind
 * auto-derivation, so the kind falls back to `model` presence.
 */
const liftLayoutTableSearchFields = (
  obj: Record<string, unknown>,
): Record<string, unknown> => {
  const layout = obj['layout'] as Record<string, unknown> | undefined;
  if (!layout?.['table']) return obj;
  const node = getOrCreateTableNode(layout);
  if (!('searchFields' in node)) return obj;
  const { searchFields, ...rest } = node;
  const kind =
    (obj['kind'] as string | undefined) ??
    (obj['model'] !== undefined ? 'prisma' : 'custom');
  return mergeSearchFieldsIntoFindAll(
    { ...obj, layout: replaceTableNodeInLayout(layout, rest) },
    (searchFields as string[] | undefined) ?? [],
    kind,
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

      obj = liftLayoutTableSearchFields(obj);

      // Auto-derive kind='prisma' when a model is present and kind is unset.
      if (obj['kind'] === undefined && obj['model'] !== undefined) {
        obj = { ...obj, kind: 'prisma' };
      }

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


      // Backward-compat: lift deprecated column-level table flags into layout.table
      const columns = obj['columns'] as
        Record<string, Record<string, unknown>> | undefined;
      if (columns && typeof columns === 'object' && !Array.isArray(columns)) {
        const searchFields: string[] = [];
        const filterFields: string[] = [];
        const controlOverrides: Record<string, Record<string, unknown>> = {};

        for (const [id, col] of Object.entries(columns)) {
          if (!col || typeof col !== 'object') continue;
          if (col['searchable']) searchFields.push(id);
          if (col['filterable']) filterFields.push(id);
          const hasCtrl =
            col['sortable'] !== undefined ||
            col['defaultSort'] !== undefined ||
            col['showWhen'] ||
            col['hideWhen'] ||
            col['disabledWhen'];
          if (hasCtrl) {
            controlOverrides[id] = {
              id,
              ...(col['sortable'] !== undefined && {
                sortable: col['sortable'],
              }),
              ...(col['defaultSort'] !== undefined && {
                defaultSort: col['defaultSort'],
              }),
              ...(col['showWhen'] ? { showWhen: col['showWhen'] } : {}),
              ...(col['hideWhen'] ? { hideWhen: col['hideWhen'] } : {}),
              ...(col['disabledWhen']
                ? { disabledWhen: col['disabledWhen'] }
                : {}),
            };
          }
        }

        if (
          searchFields.length ||
          filterFields.length ||
          Object.keys(controlOverrides).length
        ) {
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
          const mergedItems = [
            ...existingItems,
            ...Object.values(controlOverrides).filter(
              (c) => !existingIds.has(c['id'] as string),
            ),
          ];
          obj = {
            ...obj,
            layout: patchTableNodeInLayout(layout, {
              ...(filterFields.length && {
                filterFields: [
                  ...((tableNode['filterFields'] as string[]) ?? []),
                  ...filterFields.filter(
                    (f) =>
                      !((tableNode['filterFields'] as string[]) ?? []).includes(
                        f,
                      ),
                  ),
                ],
              }),
              ...(mergedItems.length > existingItems.length && {
                items: mergedItems,
              }),
            }),
          };
          // Lift column searchable flags → operations.findAll.search
          obj = mergeSearchFieldsIntoFindAll(
            obj,
            searchFields,
            obj['kind'] as string | undefined,
          );
        }
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
          id: (obj.id ?? obj.name) as string,
          route: (obj.route ?? obj.id ?? obj.name ?? '') as string,
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
