import type { ViewJsonSchemaSource } from './layout-builder.types';
import type { JsonColumn } from '../../resource/Column';
import { isRelation } from '../../view/column-predicates';
import { sortByPosition, toViewColumn } from '../../view/column.utils';
import { applySchemaTransforms } from '../../view/schema-transforms';
import { buildTableUiSchema } from '../../view/table-schema.builder';
import type { ViewConfig } from '../../view/view.schema';

const NON_NULL_TYPES = ['object', 'array', 'string', 'number', 'boolean'];
const SHAPE_KEYS = ['type', 'enum', 'const', 'anyOf', 'oneOf', 'allOf', '$ref'];

const injectFieldDefaults = (
  jsonSchema: Record<string, unknown>,
  columns: JsonColumn[],
): void => {
  const properties = jsonSchema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties) return;
  for (const col of columns) {
    if (col.fieldInput?.defaultValue === undefined) continue;
    const prop = properties[col.id];
    if (prop) prop.default = col.fieldInput.defaultValue;
  }
};

export const applyRequiredColumns = (
  jsonSchema: Record<string, unknown>,
  columns: JsonColumn[] | undefined,
): void => {
  if (!columns?.length) return;
  const properties = jsonSchema['properties'] as Record<string, unknown> | undefined;
  if (!properties) return;

  const required = new Set(
    Array.isArray(jsonSchema['required']) ? (jsonSchema['required'] as string[]) : [],
  );

  for (const col of columns) {
    if (col.required === undefined) continue;
    if (!(col.id in properties)) continue;
    if (!col.required) {
      required.delete(col.id);
      continue;
    }
    if (col.idField) continue;
    if (col.createable === false && col.updateable === false) continue;
    required.add(col.id);

    const property = properties[col.id];
    if (
      property &&
      typeof property === 'object' &&
      !SHAPE_KEYS.some((key) => key in (property as Record<string, unknown>))
    ) {
      (property as Record<string, unknown>)['type'] = [...NON_NULL_TYPES];
    }
  }

  if (required.size) jsonSchema['required'] = [...required];
  else delete jsonSchema['required'];
};

/**
 * Build a ViewConfig from a set of columns and a JSON schema source.
 * Central workhorse for all view kinds (form, view, table, filter).
 */
export const buildView = (
  source: ViewJsonSchemaSource | undefined,
  columns: JsonColumn[] | undefined,
  visible: (column: JsonColumn) => boolean,
  buildUiSchema: (cols: JsonColumn[]) => Record<string, unknown> | object,
  sort = false,
  schemaVisible?: (column: JsonColumn) => boolean,
  resourceName?: string,
): ViewConfig | undefined => {
  if (!source || !columns?.length) return undefined;
  const visibleCols = sort
    ? sortByPosition(columns.filter(visible))
    : columns.filter(visible);
  if (!visibleCols.length) return undefined;

  const schemaCols = (
    schemaVisible
      ? columns.filter((c) => visible(c) || schemaVisible(c))
      : visibleCols
  ).filter((c) => !isRelation(c));

  const jsonSchema = source(schemaCols);
  if (!jsonSchema) return undefined;
  applySchemaTransforms(jsonSchema);
  injectFieldDefaults(jsonSchema, visibleCols);

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
     
    ui_schema: buildUiSchema(visibleCols) as unknown as Record<string, unknown>,
    columns: visibleCols.map((col) => toViewColumn(col, resourceName)),
  };
};

export const emptyTableView = (): ViewConfig => ({
  json_schema: { type: 'object', additionalProperties: true, properties: {} },
  ui_schema: buildTableUiSchema([]),
  columns: [],
});
