import {
  ZodObject,
  type ZodRawShape,
  type ZodType,
  toJSONSchema,
  z,
} from 'zod';

import { type JsonSchemaInput, type SchemaInput } from './resource/json.schema';

type ToJSONSchemaParams = NonNullable<Parameters<typeof toJSONSchema>[1]>;
type OverrideContext = Parameters<
  NonNullable<ToJSONSchemaParams['override']>
>[0];

/** Post-process override: patch date schemas to `{ type: "string", format: "date-time" }`. */
const dateOverride = ({ zodSchema, jsonSchema }: OverrideContext) => {
  if (zodSchema instanceof z.ZodDate) {
    jsonSchema.type = 'string';
    jsonSchema.format = 'date-time';
  }
};

export const jsonSchemaOpts = {
  unrepresentable: 'any' as const,
  override: dateOverride,
};

export function isZodSchema(
  schema: SchemaInput,
): schema is ZodObject<ZodRawShape> {
  return schema instanceof ZodObject;
}

/** A property is nullable when its `anyOf` contains a `{ type: "null" }` branch. */
const isNullableProperty = (property: unknown): boolean => {
  const anyOf = (property as Record<string, unknown>)?.['anyOf'];
  return (
    Array.isArray(anyOf) &&
    anyOf.some((s: Record<string, unknown>) => s?.['type'] === 'null')
  );
};

/** Nullable fields are treated as optional: drop them from `required` (keeping the null branch). */
const dropNullableFromRequired = (jsonSchema: Record<string, any>): void => {
  const { properties, required } = jsonSchema;
  if (!properties || !Array.isArray(required)) return;
  jsonSchema.required = required.filter(
    (key: string) => !isNullableProperty(properties[key]),
  );
};

/** Returns a plain JSON Schema object for Swagger / AJV */
export function toJsonSchema(schema: SchemaInput): JsonSchemaInput {
  if (isZodSchema(schema)) {
    const jsonSchema = toJSONSchema(schema, {
      target: 'openApi3',
      ...jsonSchemaOpts,
    }) as Record<string, any>;

    dropNullableFromRequired(jsonSchema);

    return jsonSchema as JsonSchemaInput;
  }
  return schema;
}

/**
 * Strip wrapping types (`optional`, `nullable`, `default`, `readonly`)
 * to get at the actual underlying zod type.
 */
const unwrap = (schema: ZodType): ZodType => {
  let s: any = schema;
  let t: string | undefined = s?._zod?.def?.type;
  while (
    t === 'optional' ||
    t === 'nullable' ||
    t === 'default' ||
    t === 'readonly'
  ) {
    s = s._zod.def.innerType;
    t = s?._zod?.def?.type;
  }
  return s as ZodType;
};

const typeOf = (schema: ZodType): string | undefined =>
  (schema as any)?._zod?.def?.type;

/**
 * Build a Prisma-compatible `select` tree from a zod schema. Scalar
 * fields become `true`; nested objects (and arrays of objects) become
 * `{ select: { ... } }` so relations are loaded in one query.
 *
 * For non-zod (raw) JSON schemas we fall back to a flat top-level select.
 */
export function toSelectFields(schema: SchemaInput): Record<string, any> {
  if (!isZodSchema(schema)) {
    return Object.keys(schema.properties).reduce<Record<string, any>>(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {},
    );
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(schema.shape)) {
    const inner = unwrap(value as ZodType);
    const t = typeOf(inner);

    if (t === 'object') {
      result[key] = { select: toSelectFields(inner as ZodObject<ZodRawShape>) };
      continue;
    }

    if (t === 'array') {
      const element = unwrap((inner as any)._zod.def.element);
      if (typeOf(element) === 'object') {
        result[key] = {
          select: toSelectFields(element as ZodObject<ZodRawShape>),
        };
        continue;
      }
    }

    result[key] = true;
  }
  return result;
}
