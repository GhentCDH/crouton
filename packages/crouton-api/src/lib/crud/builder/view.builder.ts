import { type ZodObject, type ZodRawShape, toJSONSchema } from 'zod';

import type { JsonColumn } from '@ghentcdh/crouton-core';

import { jsonSchemaOpts } from '../schema.utils';
import { isRelation } from './column-predicates';
import { sortByPosition, toViewColumn } from './column.utils';
import { buildFormUiSchema } from './form-schema.builder';
import { applySchemaTransforms } from './schema-transforms';
import { resolveDefaultSort } from './sort.helpers';
import { buildTableUiSchema } from './table-schema.builder';
import type { ViewConfig } from '../resource/view.schema';

// ── Filter schema enrichment ──────────────────────────────────────────────

/**
 * Patch a filter view's JSON schema properties with human-readable titles and
 * enum/type hints so the frontend can show correct labels, restricted operator
 * lists, and a select box for enum fields.
 *
 * Called after `buildView` for the filter view, where `columns` are the
 * filterable columns (already enum-injected by `injectEnumValues`).
 */
export const patchFilterProperties = (
  jsonSchema: Record<string, any>,
  columns: JsonColumn[] | undefined,
): void => {
  if (!columns?.length) return;
  const properties = jsonSchema.properties as Record<string, any> | undefined;
  if (!properties) return;

  for (const col of columns) {
    // A date-range json column isn't filterable as a whole object. Expand it
    // into two date filter fields keyed with the `->` json-path marker that
    // the API filter builder (buildFilterWhere) understands, e.g.
    // `date_range->from` / `date_range->to`. The frontend filter dropdown
    // reads these straight from `properties` and emits `key:value:operator`.
    if (col.fieldInput?.format === 'date-range') {
      delete properties[col.id];
      const opts =
        (col.fieldInput?.options as Record<string, unknown> | undefined) ?? {};
      const base = col.label ?? col.id;
      const fromField = (opts['fromField'] as string) ?? 'from';
      const toField = (opts['toField'] as string) ?? 'to';
      const dateProp = (title: string) => ({
        type: 'string',
        format: 'date',
        title,
        'x-field-type': 'date',
      });
      properties[`${col.id}->${fromField}`] = dateProp(
        (opts['fromLabel'] as string) ?? `${base} (from)`,
      );
      properties[`${col.id}->${toField}`] = dateProp(
        (opts['toLabel'] as string) ?? `${base} (to)`,
      );
      continue;
    }

    const prop = properties[col.id];
    if (!prop) continue;

    // Always inject title from the column label.
    prop.title = col.label ?? col.id;

    // Inject enum values so the UI can render a select box.
    const values = (
      col.fieldInput?.options as Record<string, unknown> | undefined
    )?.['values'];
    if (values) {
      prop['x-values'] = values;
    }

    // Inject a field-type hint for operator restriction on the frontend.
    const ft = col.fieldInput?.type;
    if (ft === 'select' || col.enum) {
      prop['x-field-type'] = 'enum';
    } else if (
      ft === 'number' ||
      prop.type === 'number' ||
      prop.type === 'integer'
    ) {
      prop['x-field-type'] = 'number';
    } else if (prop.format === 'date-time' || prop.format === 'date') {
      prop['x-field-type'] = 'date';
    } else if (prop.type === 'boolean') {
      prop['x-field-type'] = 'boolean';
    }
    // string / default: no hint needed — frontend defaults to 'string'
  }
};

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

  // Relation columns are managed via sub-resource endpoints — exclude from
  // the schema pick so their complex Zod definitions (z.lazy arrays) don't
  // produce validation constraints on the parent. With additionalProperties
  // enabled, relation data in the payload still passes validation.
  const schemaCols = (schemaVisible
    ? columns.filter((c) => visible(c) || schemaVisible(c))
    : visibleCols
  ).filter((c) => !isRelation(c));

  const schemaIds = schemaCols.map((c) => c.id);
  const mask = Object.fromEntries(schemaIds.map((id) => [id, true as const]));
  const picked = schema.pick(mask as any);
  const jsonSchema = toJSONSchema(picked, {
    target: 'draft-07',
    ...jsonSchemaOpts,
  }) as Record<string, unknown>;
  applySchemaTransforms(jsonSchema);

  // Drop idField and explicitly non-editable fields from `required` so
  // hidden-but-schema-included fields don't cause validation failures.
  if (schemaVisible) {
    const nonEditableIds = new Set(
      schemaCols
        .filter((c) => c.idField || (c.createable === false && c.updateable === false))
        .map((c) => c.id),
    );
    const required = jsonSchema['required'] as string[] | undefined;
    if (Array.isArray(required) && nonEditableIds.size) {
      jsonSchema['required'] = required.filter((k) => !nonEditableIds.has(k));
    }
  }

  return {
    json_schema: jsonSchema,
    ui_schema: buildUiSchema(visibleCols),
    columns: visibleCols.map(toViewColumn),
  };
};

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
    (c) => !c.idField && (c.createable === true || c.updateable === true),
  );
  if (form) views.form = form;

  const filter = buildView(
    schema,
    columns,
    (c) => !!c.filterable,
    buildFormUiSchema,
    true,
  );
  if (filter) {
    patchFilterProperties(
      filter.json_schema as Record<string, any>,
      columns?.filter((c) => !!c.filterable),
    );
    views.filter = filter;
  }

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
            target[segment] = {
              type: 'object',
              properties: {},
            };
          }
          target = target[segment].properties;
        }
        target[keyPath[keyPath.length - 1]] = {
          type: 'string',
          title: c.label ?? c.id,
        };
      } else {
        const opts = c.fieldInput?.options as
          Record<string, unknown> | undefined;
        const isObject =
          opts?.emitObject === true || c.fieldInput?.type === 'autocomplete';
        properties[c.id] = {
          ...(isObject ? {} : { type: c.columnType ?? 'string' }),
          title: c.label ?? c.id,
        };
      }
    }
    const schema: Record<string, unknown> = { type: 'object', properties };
    applySchemaTransforms(schema);
    return schema;
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
