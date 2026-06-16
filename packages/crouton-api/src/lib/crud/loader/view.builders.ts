import { type ZodObject, type ZodRawShape, toJSONSchema } from 'zod';

import type { CalculatedColumn, JsonColumn } from './json-config.types';
import type { ViewColumnConfig, ViewConfig } from '../crud.config';
import { jsonSchemaOpts } from '../schema.utils';
import { buildFormUiSchema } from './form-schema.builder';
import { allowAdditionalProperties, dropNullableFromRequired, enforceRequiredMinLength } from './schema-transforms';
import { buildTableUiSchema, resolveDefaultSort } from './table-schema.builder'; // ── Column sorting ────────────────────────────────────────────────────────

// ── Column sorting ────────────────────────────────────────────────────────

/** Resolve the sort position for a column: `fieldInput.position`, then natural index. */
const colPosition = (col: JsonColumn, i: number): number =>
  col.fieldInput?.position ?? i;

/** Sort columns by position; columns without an explicit position keep array order. */
const sortByPosition = (cols: JsonColumn[]): JsonColumn[] =>
  cols
    .map((col, i) => ({ col, i }))
    .sort((a, b) => colPosition(a.col, a.i) - colPosition(b.col, b.i))
    .map(({ col }) => col);

const toViewColumn = (col: JsonColumn): ViewColumnConfig => ({
  id: col.id,
  ...(col.label && { label: col.label }),
  ...(col.sortable != null && { sortable: col.sortable }),
  ...(col.searchable != null && { searchable: col.searchable }),
  ...(col.fieldInput && { fieldInput: col.fieldInput }),
});

// ── View building ─────────────────────────────────────────────────────────

const buildView = (
  schema: ZodObject<ZodRawShape> | undefined,
  columns: JsonColumn[] | undefined,
  visible: (column: JsonColumn) => boolean,
  buildUiSchema: (cols: JsonColumn[]) => Record<string, unknown>,
  sort = false,
  schemaVisible?: (column: JsonColumn) => boolean,
): ViewConfig | undefined => {
  if (!schema || !columns?.length) return undefined;
  const visibleCols = sort
    ? sortByPosition(columns.filter(visible))
    : columns.filter(visible);
  if (!visibleCols.length) return undefined;

  const schemaCols = schemaVisible
    ? columns.filter((c) => visible(c) || schemaVisible(c))
    : visibleCols;

  const schemaIds = schemaCols.map((c) => c.id);
  const mask = Object.fromEntries(schemaIds.map((id) => [id, true as const]));
  const picked = schema.pick(mask as any);
  const jsonSchema = toJSONSchema(picked, {
    target: 'draft-07',
    ...jsonSchemaOpts,
  }) as Record<string, unknown>;
  allowAdditionalProperties(jsonSchema);
  dropNullableFromRequired(jsonSchema);
  enforceRequiredMinLength(jsonSchema);

  return {
    json_schema: jsonSchema,
    ui_schema: buildUiSchema(visibleCols),
    columns: visibleCols.map(toViewColumn),
  };
};

// ── Calculated column injection ───────────────────────────────────────────

type InjectionMode = 'table' | 'view';

const isVisibleInMode = (c: CalculatedColumn, mode: InjectionMode): boolean =>
  mode === 'table' ? !c.hiddenInTable : !c.hiddenInView;

const buildCalculatedElement = (c: CalculatedColumn, mode: InjectionMode) =>
  mode === 'table'
    ? {
        type: c.type === 'boolean' ? 'BooleanCell' : 'TextCell',
        scope: `#/properties/${c.id}`,
        options: {
          label: c.label ?? c.id,
        },
      }
    : {
        type: 'Control',
        scope: `#/properties/${c.id}`,
        options: {
          // Spread fieldInput.options first (e.g. colspan), then layer type-derived options on top.
          ...(c.fieldInput?.options ?? {}),
          label: c.label ?? c.id,
          ...(c.type === 'boolean' && { format: 'boolean' }),
        },
      };

/**
 * Effective insertion position for a calculated column.
 * `fieldInput.position` takes precedence over top-level `position`.
 * `undefined` means append to the end.
 */
const calcPosition = (c: CalculatedColumn): number | undefined =>
  c.fieldInput?.position ?? c.position;

const injectCalculatedColumnsIntoView = (
  viewConfig: ViewConfig,
  calculated: CalculatedColumn[],
  mode: InjectionMode,
): ViewConfig => {
  if (!calculated.length) return viewConfig;

  const visible = calculated.filter((c) => isVisibleInMode(c, mode));
  if (!visible.length) return viewConfig;

  const jsonSchema = { ...(viewConfig.json_schema as any) };
  jsonSchema.properties = { ...jsonSchema.properties };
  for (const c of visible) {
    jsonSchema.properties[c.id] = {
      type: c.type === 'boolean' ? 'boolean' : 'string',
      title: c.label ?? c.id,
    };
  }

  const uiSchema = { ...(viewConfig.ui_schema as any) };
  const existing: any[] = [...(uiSchema.elements ?? [])];

  // Merge-sort existing elements (implicit position = index + 0.5) with calculated
  // elements (explicit position). Using i + 0.5 means `position: N` slots a calculated
  // column before the regular column currently at index N.
  const tagged: Array<{ el: any; pos: number }> = [
    ...existing.map((el, i) => ({ el, pos: i + 0.5 })),
    ...visible.map((c) => ({
      el: buildCalculatedElement(c, mode),
      pos: calcPosition(c) ?? Infinity,
    })),
  ];
  tagged.sort((a, b) => a.pos - b.pos);
  uiSchema.elements = tagged.map((t) => t.el);

  // Insert new ViewColumnConfig entries at the same relative position.
  const columns = [...viewConfig.columns];
  for (const c of visible) {
    const pos = calcPosition(c);
    const entry: ViewColumnConfig = { id: c.id, label: c.label };
    if (pos !== undefined) {
      columns.splice(pos, 0, entry);
    } else {
      columns.push(entry);
    }
  }

  return {
    ...viewConfig,
    json_schema: jsonSchema,
    ui_schema: uiSchema,
    columns,
  };
};

/** Inject calculated columns into a table ViewConfig (TextCell/BooleanCell elements). */
export const injectCalculatedColumns = (
  tableView: ViewConfig,
  calculated: CalculatedColumn[],
): ViewConfig =>
  injectCalculatedColumnsIntoView(tableView, calculated, 'table');

/** Inject calculated columns into a form/view ViewConfig (Control elements). */
export const injectCalculatedColumnsToView = (
  viewConfig: ViewConfig,
  calculated: CalculatedColumn[],
): ViewConfig =>
  injectCalculatedColumnsIntoView(viewConfig, calculated, 'view');

// ── Public view builders ──────────────────────────────────────────────────

/**
 * A minimal, column-less `table` view. The frontend always expects
 * `schemas.table` to be an object, so resources whose columns are all hidden in
 * the table (e.g. join tables like `text_author`) still get a valid — if empty —
 * table view instead of `undefined`.
 */
const emptyTableView = (): ViewConfig => ({
  json_schema: { type: 'object', additionalProperties: true, properties: {} },
  ui_schema: buildTableUiSchema([]),
  columns: [],
});

/** Build table / form / filter / view schemas from a Zod schema + column definitions. */
export const buildViews = (
  schema: ZodObject<ZodRawShape> | undefined,
  columns: JsonColumn[] | undefined,
): Record<string, ViewConfig> | undefined => {
  const views: Record<string, ViewConfig> = {};

  const table = buildView(
    schema,
    columns,
    (c) => !c.hiddenInTable,
    buildTableUiSchema,
  );
  if (table) {
    table.defaultSort = resolveDefaultSort(
      table.columns as JsonColumn[],
      columns,
    );
    views.table = table;
  } else if (columns?.length) {
    views.table = emptyTableView();
  }

  const form = buildView(
    schema,
    columns,
    (c) => !c.hiddenInForm,
    buildFormUiSchema,
    true,
    (c) => c.createable === true || c.updateable === true,
  );
  if (form) views.form = form;

  const filter = buildView(
    schema,
    columns,
    (c) => !!c.filterable,
    buildFormUiSchema,
    true,
  );
  if (filter) views.filter = filter;

  const view = buildView(
    schema,
    columns,
    (c) => !c.hiddenInView,
    buildFormUiSchema,
    true,
  );
  if (view) views.view = view;

  return Object.keys(views).length ? views : undefined;
};

/**
 * Build views from column definitions without a Zod schema.
 * Used for sub-resources. Columns with `col.column` are grouped as nested objects
 * to match the actual API response shape.
 */
export const buildViewsFromColumns = (
  columns: JsonColumn[] | undefined,
): Record<string, ViewConfig> | undefined => {
  if (!columns?.length) return undefined;

  const buildJsonSchema = (cols: JsonColumn[]): Record<string, unknown> => {
    const properties: Record<string, any> = {};
    for (const c of cols) {
      if (c.column) {
        if (!properties[c.column]) {
          properties[c.column] = {
            type: 'object',
            additionalProperties: true,
            properties: {},
          };
        }
        // Support dotted displayKey paths (e.g. "internal_author.name") by building
        // nested object nodes so the JSON schema mirrors the actual data structure.
        const keyPath = (c.displayKey ?? c.id).split('.');
        let target = properties[c.column].properties;
        for (let i = 0; i < keyPath.length - 1; i++) {
          const segment = keyPath[i];
          if (!target[segment]) {
            target[segment] = { type: 'object', additionalProperties: true, properties: {} };
          }
          target = target[segment].properties;
        }
        target[keyPath[keyPath.length - 1]] = {
          type: 'string',
          title: c.label ?? c.id,
        };
      } else {
        properties[c.id] = {
          type: c.columnType ?? 'string',
          title: c.label ?? c.id,
        };
      }
    }
    return { type: 'object', additionalProperties: true, properties };
  };

  /** Rewrite scopes for nested columns to match the grouped JSON schema. */
  const fixNestedScopes = (
    uiSchema: Record<string, unknown>,
    cols: JsonColumn[],
  ): Record<string, unknown> => {
    const colMap = Object.fromEntries(cols.map((c) => [c.id, c]));
    const elements = (uiSchema as any).elements as any[] | undefined;
    if (!elements) return uiSchema;
    return {
      ...uiSchema,
      elements: elements.map((el) => {
        const id = (el.scope as string | undefined)?.replace(
          '#/properties/',
          '',
        );
        const col = id ? colMap[id] : undefined;
        if (!col?.column) return el;
        // Support dotted displayKey paths (e.g. "internal_author.name") — each segment
        // becomes a nested /properties/ step in the JSON pointer.
        const keyPath = (col.displayKey ?? col.id).split('.');
        const propPath = keyPath.map((k) => `properties/${k}`).join('/');
        return {
          ...el,
          scope: `#/properties/${col.column}/${propPath}`,
        };
      }),
    };
  };

  const makeView = (
    visible: JsonColumn[],
    buildUiSchema: (cols: JsonColumn[]) => Record<string, unknown>,
  ): ViewConfig | undefined => {
    if (!visible.length) return undefined;
    return {
      json_schema: buildJsonSchema(visible),
      ui_schema: fixNestedScopes(buildUiSchema(visible), visible),
      columns: visible.map(toViewColumn),
    };
  };

  const views: Record<string, ViewConfig> = {};

  const tableCols = sortByPosition(columns.filter((c) => !c.hiddenInTable));
  const table = makeView(tableCols, buildTableUiSchema);
  if (table) {
    table.defaultSort = resolveDefaultSort(tableCols, columns);
    views.table = table;
  } else {
    views.table = emptyTableView();
  }

  const formCols = sortByPosition(columns.filter((c) => !c.hiddenInForm));
  const form = makeView(formCols, buildFormUiSchema);
  if (form) views.form = form;

  const viewCols = sortByPosition(columns.filter((c) => !c.hiddenInView));
  const viewView = makeView(viewCols, buildFormUiSchema);
  if (viewView) views.view = viewView;

  return Object.keys(views).length ? views : undefined;
};
