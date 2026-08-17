import { z } from 'zod';

/**
 * Column data types.
 *
 * A column's `type` is either a shorthand string or a JSON Schema fragment.
 * For a `kind: "custom"` resource these are the *only* source of the resource's
 * json_schema — there is no Prisma model to derive it from.
 */

/** Shorthand names, expanded to a JSON Schema fragment by `columnTypeToJsonSchema`. */
export const ColumnTypeShorthandSchema = z.enum([
  'string',
  'number',
  'integer',
  'boolean',
  'date',
  'date-time',
  'object',
  'array',
]);

export type ColumnTypeShorthand = z.infer<typeof ColumnTypeShorthandSchema>;

/**
 * A JSON Schema fragment describing one column.
 *
 * Deliberately a permissive subset: enough to express the shapes the form and
 * table layers can render (scalars, nested objects, arrays, enums, nullables)
 * without re-implementing all of JSON Schema. Unknown keys pass through so a
 * fragment can carry vendor extensions (`x-*`).
 */
export type JsonSchemaFragment = {
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  const?: unknown;
  nullable?: boolean;
  properties?: Record<string, JsonSchemaFragment>;
  required?: string[];
  items?: JsonSchemaFragment;
  additionalProperties?: boolean | JsonSchemaFragment;
  title?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  [key: string]: unknown;
};

export const JsonSchemaFragmentSchema: z.ZodType<JsonSchemaFragment> = z.lazy(
  () =>
    z
      .object({
        type: z.union([z.string(), z.array(z.string())]).optional(),
        format: z.string().optional(),
        enum: z.array(z.unknown()).optional(),
        const: z.unknown().optional(),
        nullable: z.boolean().optional(),
        properties: z.record(z.string(), JsonSchemaFragmentSchema).optional(),
        required: z.array(z.string()).optional(),
        items: JsonSchemaFragmentSchema.optional(),
        additionalProperties: z
          .union([z.boolean(), JsonSchemaFragmentSchema])
          .optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        default: z.unknown().optional(),
        minimum: z.number().optional(),
        maximum: z.number().optional(),
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        pattern: z.string().optional(),
      })
      .catchall(z.unknown()),
);

/** Either a shorthand name or a full JSON Schema fragment. */
export const ColumnTypeSchema = z.union([
  ColumnTypeShorthandSchema,
  JsonSchemaFragmentSchema,
]);

export type ColumnType = z.infer<typeof ColumnTypeSchema>;

const SHORTHAND_FRAGMENTS: Record<ColumnTypeShorthand, JsonSchemaFragment> = {
  string: { type: 'string' },
  number: { type: 'number' },
  integer: { type: 'integer' },
  boolean: { type: 'boolean' },
  date: { type: 'string', format: 'date' },
  'date-time': { type: 'string', format: 'date-time' },
  object: { type: 'object' },
  array: { type: 'array' },
};

const isShorthand = (type: ColumnType): type is ColumnTypeShorthand =>
  typeof type === 'string';

/** Expand a column `type` into a JSON Schema fragment. */
export const columnTypeToJsonSchema = (
  type: ColumnType | undefined,
): JsonSchemaFragment => {
  if (type === undefined) return { type: 'string' };
  if (isShorthand(type)) return { ...SHORTHAND_FRAGMENTS[type] };
  return type;
};

/**
 * The effective JSON Schema `type` of a column, as a single string.
 *
 * Union types (`["string", "null"]`) collapse to their first non-null member,
 * matching how the table layer picks a cell renderer.
 */
export const columnTypeName = (type: ColumnType | undefined): string => {
  const fragment = columnTypeToJsonSchema(type);
  const raw = fragment.type;
  if (Array.isArray(raw)) return raw.find((t) => t !== 'null') ?? 'string';
  if (typeof raw === 'string') return raw;
  // No explicit type but nested properties/items present — infer it.
  if (fragment.properties) return 'object';
  if (fragment.items) return 'array';
  return 'string';
};

/** `true` when the column holds a nested object with declared properties. */
export const isObjectColumnType = (type: ColumnType | undefined): boolean =>
  columnTypeName(type) === 'object';

/** `true` when the column holds an array. */
export const isArrayColumnType = (type: ColumnType | undefined): boolean =>
  columnTypeName(type) === 'array';
