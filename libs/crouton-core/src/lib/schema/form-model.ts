import type { JsonSchema, Layout } from '@jsonforms/core';
import type { ZodObject, ZodRawShape } from 'zod';
import { toJSONSchema } from 'zod';

export enum ModalSize {
  xs = 'xs',
  sm = 'sm',
  lg = 'lg',
  xl = 'xl',
}

export type ModalSizeType = keyof typeof ModalSize;

/** @deprecated Use `ModalSize` instead. */
export { ModalSize as Size };
/** @deprecated Use `ModalSizeType` instead. */
export type SizeType = ModalSizeType;

export type JsonFormsLayout = {
  uiSchema: Layout;
  schema: JsonSchema;
  modalSize?: ModalSizeType;
};

export type FormSchemaModel = {
  form: JsonFormsLayout;
  table?: JsonFormsLayout;
  filter?: JsonFormsLayout;
  uri: string;
  searchUri: string;
};

/** Collapses a nullable `anyOf` to its non-null branch. Returns true if the property was nullable. */
const simplifyNullableAnyOf = (property: Record<string, unknown>): boolean => {
  const anyOf = property['anyOf'];
  if (!Array.isArray(anyOf) || anyOf.length !== 2) return false;
  const items = anyOf as Record<string, unknown>[];
  const nonNull = items.find((s) => s['type'] !== 'null');
  const hasNull = items.some((s) => s['type'] === 'null');
  if (nonNull && hasNull) {
    delete property['anyOf'];
    Object.assign(property, nonNull);
    return true;
  }
  return false;
};

const transformToJsonSchema = (schema: ZodObject<ZodRawShape>): JsonSchema => {
  const jsonSchema = toJSONSchema(schema, { unrepresentable: 'any', target: 'draft-07' }) as Record<string, unknown>;
  jsonSchema['additionalProperties'] = true;
  const properties = jsonSchema['properties'] as Record<string, Record<string, unknown>> | undefined;
  if (properties) {
    const nullableKeys = new Set<string>();
    for (const key of Object.keys(properties)) {
      if (simplifyNullableAnyOf(properties[key])) nullableKeys.add(key);
    }
    // Nullable fields are treated as optional, so drop them from `required`.
    const required = jsonSchema['required'];
    if (Array.isArray(required)) {
      jsonSchema['required'] = (required as string[]).filter((key) => !nullableKeys.has(key));
    }
  }
  return jsonSchema as JsonSchema;
};

export const createSchema = (props: {
  uiSchema: Layout;
  tableSchema?: JsonSchema;
  filterSchema?: JsonSchema;
  schema: ZodObject<ZodRawShape>;
  dtoSchema: ZodObject<ZodRawShape>;
  responseSchema?: ZodObject<ZodRawShape>;
  uri: string;
  searchUri?: string;
  modalSize?: ModalSizeType;
}) => {
  if (!props.schema) throw new Error('no schema provided');
  const schema = props.schema;
  const dtoSchema = props.dtoSchema;
  const formSchema = transformToJsonSchema(dtoSchema);
  const optionalSchema = transformToJsonSchema(schema.partial());
  return {
    dtoSchema,
    responseSchema: props.responseSchema ?? dtoSchema,
    schema: {
      form: { uiSchema: props.uiSchema, schema: formSchema, modalSize: props.modalSize ?? 'sm' },
      table: props.tableSchema ? { uiSchema: props.tableSchema, schema: optionalSchema } : undefined,
      filter: props.filterSchema ? { uiSchema: props.filterSchema, schema: optionalSchema } : undefined,
      uri: props.uri,
      searchUri: props.searchUri ?? `${props.uri}?filter=`,
    } as FormSchemaModel,
  };
};
