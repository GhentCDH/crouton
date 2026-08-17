import { isAutocomplete } from './column-predicates';
import type { JsonColumn } from '../resource/Column';
import {
  type JsonSchemaFragment,
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
  const unwrapped = values.map((v) =>
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
