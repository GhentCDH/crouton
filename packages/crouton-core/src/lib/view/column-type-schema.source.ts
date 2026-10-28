import { isAutocomplete } from '../schema/column/predicates';
import { applySchemaTransforms } from './schema-transforms';
import type { JsonColumn } from '../resource/Column';
import {
  type JsonSchemaFragment,
  columnTypeName,
  columnTypeToJsonSchema,
} from '../resource/ColumnType.schema';

/**
 * Assemble a view's `json_schema` from the columns' declared `type`s.
 *
 * This is the `kind: "custom"` counterpart to `zodSchemaSource`: a custom
 * resource has no `schema.ts`, so the column configuration is the only
 * description of the data shape.
 *
 * A column's property is its `type` fragment (shorthand expanded), enriched
 * with:
 * - `title` from the column label, so the form and filter layers show a proper
 *   heading without a second lookup;
 * - `default` from `fieldInput.defaultValue`, matching the Zod path where
 *   `injectFieldDefaults` does the same;
 * - `enum` from `fieldInput.options.values`, so an enum-backed select validates
 *   against its own option list.
 *
 * An autocomplete column with no declared `type` is emitted as a typeless
 * property, matching `buildViewsFromColumns`: the value is a `{value, label}`
 * envelope whose exact shape depends on the widget's `storeValue` option.
 */
const optionValues = (col: JsonColumn): unknown[] | undefined => {
  const values = (col.fieldInput?.options as Record<string, unknown> | undefined)
    ?.['values'];
  if (!Array.isArray(values)) return undefined;
  // Options are either primitives or `{ value, label }` envelopes.
  const unwrapped = (values as unknown[]).map((v) =>
    v && typeof v === 'object' && 'value' in (v as Record<string, unknown>)
      ? (v as Record<string, unknown>).value
      : v,
  );
  return unwrapped.length ? unwrapped : undefined;
};

/** JSON Schema property for a single column, derived from its `type`. */
export const columnToJsonSchemaProperty = (
  col: JsonColumn,
): JsonSchemaFragment => {
  const property: JsonSchemaFragment =
    col.type === undefined && isAutocomplete(col)
      ? {}
      : { ...columnTypeToJsonSchema(col.type) };

  if (property.title === undefined) property.title = col.label ?? col.id;

  if (
    col.fieldInput?.defaultValue !== undefined &&
    property.default === undefined
  ) {
    property.default = col.fieldInput.defaultValue;
  }

  if (property.enum === undefined) {
    const values = optionValues(col);
    if (values) property.enum = values;
  }

  return property;
};

/**
 * `ViewJsonSchemaSource` for resources without a Zod model schema.
 *
 * Returns `undefined` when no column contributes a property, so the caller
 * skips the view — same contract as `zodSchemaSource`.
 */
export const columnTypeSchemaSource = (
  schemaCols: JsonColumn[],
): Record<string, unknown> | undefined => {
  if (!schemaCols.length) return undefined;

  const properties: Record<string, JsonSchemaFragment> = {};
  for (const col of schemaCols) {
    properties[col.id] = columnToJsonSchemaProperty(col);
  }

  return { type: 'object', properties };
};

/**
 * `ViewJsonSchemaSource` for sub-resources with extend columns (`col.column !== col.id`).
 * Groups nested columns under their parent `col.column` object, matching the
 * actual API response shape for manyToOne relations.
 */
export const nestedColumnSchemaSource = (cols: JsonColumn[]): Record<string, unknown> => {
  const properties: Record<string, Record<string, unknown>> = {};
  for (const c of cols) {
    if (c.column && c.column !== c.id) {
      if (!properties[c.column]) {
        properties[c.column] = { type: 'object', properties: {} };
      }
      const keyPath = (c.displayKey ?? c.id).split('.');
      let target = properties[c.column]['properties'] as Record<string, Record<string, unknown>>;
      for (let i = 0; i < keyPath.length - 1; i++) {
        const segment = keyPath[i];
        if (!target[segment]) target[segment] = { type: 'object', properties: {} };
        target = target[segment]['properties'] as Record<string, Record<string, unknown>>;
      }
      target[keyPath[keyPath.length - 1]] = { type: 'string', title: c.label ?? c.id };
    } else if (c.type !== undefined) {
      properties[c.id] = columnToJsonSchemaProperty(c);
    } else {
      const opts = c.fieldInput?.options as Record<string, unknown> | undefined;
      const isObject = opts?.emitObject === true || c.fieldInput?.type === 'autocomplete';
      properties[c.id] = {
        ...(isObject ? {} : { type: columnTypeName(c.type) ?? 'string' }),
        title: c.label ?? c.id,
        ...(c.fieldInput?.defaultValue !== undefined ? { default: c.fieldInput.defaultValue } : {}),
      };
    }
  }
  const schema: Record<string, unknown> = { type: 'object', properties };
  applySchemaTransforms(schema);
  return schema;
};

/**
 * Rewrite UI schema element scopes for extend columns (col.column !== col.id) to
 * match the nested JSON schema produced by `nestedColumnSchemaSource`.
 * Elements for non-nested columns are returned unchanged.
 */
export const fixNestedUiSchemaScopes = (
  uiSchema: Record<string, unknown>,
  cols: JsonColumn[],
): Record<string, unknown> => {
  const colMap = Object.fromEntries(cols.map((c) => [c.id, c]));
  const elements = (uiSchema as Record<string, unknown>)['elements'] as unknown[] | undefined;
  if (!elements) return uiSchema;
  return {
    ...uiSchema,
    elements: elements.map((el) => {
      const elem = el as Record<string, unknown>;
      const id = (elem['scope'] as string | undefined)?.replace('#/properties/', '');
      const col = id ? colMap[id] : undefined;
      if (!col?.column || col.column === col.id) return elem;
      const keyPath = (col.displayKey ?? col.id).split('.');
      const propPath = keyPath.map((k) => `properties/${k}`).join('/');
      return { ...elem, scope: `#/properties/${col.column}/${propPath}` };
    }),
  };
};
