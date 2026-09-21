import { ZodObject, type ZodRawShape, toJSONSchema } from 'zod';

import type { JsonSchemaInput, SchemaInput } from './schema-input';
import { isNullableProperty } from '../schema.utils';
import { jsonSchemaOpts } from '../view/json-schema.opts';


export const isZodSchema = (
  schema: SchemaInput,
): schema is ZodObject<ZodRawShape> => schema instanceof ZodObject;

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
