import { ZodObject, type ZodRawShape, type ZodType, toJSONSchema, z } from 'zod';

import { type JsonSchema, type SchemaInput } from './crud.config';

/** Post-process override: patch date schemas to `{ type: "string", format: "date-time" }`. */
const dateOverride = ({ zodSchema, jsonSchema }: { zodSchema: ZodType; jsonSchema: Record<string, unknown>; path: string[] }) => {
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

/** Returns a plain JSON Schema object for Swagger / AJV */
export function toJsonSchema(schema: SchemaInput): JsonSchema {
  if (isZodSchema(schema)) {
    return toJSONSchema(schema, { target: 'openApi3', ...jsonSchemaOpts }) as JsonSchema;
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
