import { ZodObject, type ZodRawShape, toJSONSchema } from 'zod';

import type { JsonSchemaInput, SchemaInput } from './schema-input';
import { isNullableProperty } from '../../schema.utils';
import { jsonSchemaOpts } from '../../view/json-schema.opts';

export const isZodSchema = (
  schema: SchemaInput,
): schema is ZodObject<ZodRawShape> => schema instanceof ZodObject;

const dropNullableFromRequiredMut = (jsonSchema: Record<string, unknown>): void => {
  const { properties, required } = jsonSchema;
  if (!properties || !Array.isArray(required)) return;
  const props = properties as Record<string, unknown>;
  jsonSchema.required = (required as string[]).filter(
    (key) => !isNullableProperty(props[key] as Record<string, unknown>),
  );
};

export const toJsonSchema = (schema: SchemaInput): JsonSchemaInput => {
  if (isZodSchema(schema)) {
    let jsonSchema: Record<string, unknown>;
    try {
      jsonSchema = toJSONSchema(schema, {
        target: 'openApi3',
        ...jsonSchemaOpts,
      }) as Record<string, unknown>;
    } catch {
      return { type: 'object' } as JsonSchemaInput;
    }
    dropNullableFromRequiredMut(jsonSchema);
    return jsonSchema as JsonSchemaInput;
  }
  return schema;
};
