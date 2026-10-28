import { type ZodObject, type ZodRawShape, toJSONSchema } from 'zod';

import type { JsonColumn } from '../../resource/Column';
import { jsonSchemaOpts } from '../../view/json-schema.opts';

/**
 * Produces the JSON schema (`data`) for one view from the columns that belong in it.
 *
 * Two implementations exist: `zodSchemaSource` picks a mask off the resource's
 * Zod model schema (prisma resources), and `columnTypeSchemaSource` assembles
 * properties from each column's declared `type` (custom resources, which have
 * no `schema.ts`). Returning `undefined` skips the view entirely.
 */
export type ViewJsonSchemaSource = (
  schemaCols: JsonColumn[],
) => Record<string, unknown> | undefined;

/** Build a view's JSON schema (`data`) by picking a mask off the resource's Zod schema. */
export const zodSchemaSource =
  (schema: ZodObject<ZodRawShape>): ViewJsonSchemaSource =>
  (schemaCols) => {
    const schemaKeys = new Set(Object.keys(schema.shape));
    const schemaIds = schemaCols
      .map((c) => c.id)
      .filter((id) => schemaKeys.has(id));
    if (!schemaIds.length) return undefined;
    const mask = Object.fromEntries(schemaIds.map((id) => [id, true as const]));
    const picked = schema.pick(mask as { [k in keyof ZodRawShape]?: true });
    try {
      return toJSONSchema(picked, {
        target: 'draft-07',
        ...jsonSchemaOpts,
      }) as Record<string, unknown>;
    } catch {
      // Zod v4 bug: z.record() inside z.union() inside z.lazy() crashes toJSONSchema.
      // Skip this field's JSON schema contribution — the column's type will be used instead.
      return undefined;
    }
  };

/**
 * Patch a filter view's JSON schema properties with human-readable titles and
 * enum/type hints so the frontend can show correct labels, restricted operator
 * lists, and a select box for enum fields.
 *
 * Called after `buildView` for the filter view, where `columns` are the
 * filterable columns (already enum-injected by `injectEnumValues`).
 */
export const patchFilterProperties = (
  jsonSchema: Record<string, unknown>,
  columns: JsonColumn[] | undefined,
): void => {
  if (!columns?.length) return;
  const properties = jsonSchema['properties'] as Record<string, unknown> | undefined;
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

    // Columns absent from the schema pick (relations, manyToOne autocompletes, etc.)
    // need a string property so the filter UI can render a text input for them.
    if (!properties[col.id]) {
      properties[col.id] = { type: 'string', title: col.label ?? col.id };
    }

    const prop = properties[col.id] as Record<string, unknown> | undefined;
    if (!prop) continue;

    // Always inject title from the column label.
    prop['title'] = col.label ?? col.id;

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
