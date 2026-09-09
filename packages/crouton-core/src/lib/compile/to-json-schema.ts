import { ZodObject, type ZodRawShape, toJSONSchema } from 'zod';

import type { JsonSchemaInput, SchemaInput } from './schema-input';
import { jsonSchemaOpts } from '../view/json-schema.opts';


export const isZodSchema = (
  schema: SchemaInput,
): schema is ZodObject<ZodRawShape> => schema instanceof ZodObject;

const isNullableProperty = (property: unknown): boolean => {
  const anyOf = (property as Record<string, unknown>)?.['anyOf'];
  return (
    Array.isArray(anyOf) &&
    anyOf.some((s: Record<string, unknown>) => s?.['type'] === 'null')
  );
};

const dropNullableFromRequired = (jsonSchema: Record<string, any>): void => {
  const { properties, required } = jsonSchema;
  if (!properties || !Array.isArray(required)) return;
  jsonSchema.required = required.filter(
    (key: string) => !isNullableProperty(properties[key]),
  );
};

export const toJsonSchema = (schema: SchemaInput): JsonSchemaInput => {
  if (isZodSchema(schema)) {
    let jsonSchema: Record<string, any>;
    try {
      jsonSchema = toJSONSchema(schema, {
        target: 'openApi3',
        ...jsonSchemaOpts,
      }) as Record<string, any>;
    } catch {
      return { type: 'object' } as JsonSchemaInput;
    }
    dropNullableFromRequired(jsonSchema);
    return jsonSchema as JsonSchemaInput;
  }
  return schema;
};
