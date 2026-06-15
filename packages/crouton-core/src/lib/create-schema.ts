import type { JsonSchema, Layout } from '@jsonforms/core';
import type { ZodObject } from 'zod';
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
  const nonNull = anyOf.find((s: Record<string, unknown>) => s['type'] !== 'null');
  const hasNull = anyOf.some((s: Record<string, unknown>) => s['type'] === 'null');
  if (nonNull && hasNull) {
    delete property['anyOf'];
    Object.assign(property, nonNull);
    return true;
  }
  return false;
};

const transformToJsonSchema = (schema: ZodObject<any>): JsonSchema => {
  const jsonSchema = toJSONSchema(schema, { unrepresentable: 'any', target: 'draft-07' });
  jsonSchema.additionalProperties = true;
  const properties = (jsonSchema as any).properties;
  if (properties) {
    const nullableKeys = new Set<string>();
    for (const key of Object.keys(properties)) {
      if (simplifyNullableAnyOf(properties[key])) nullableKeys.add(key);
    }
    // Nullable fields are treated as optional, so drop them from `required`.
    const required = (jsonSchema as any).required;
    if (Array.isArray(required)) {
      (jsonSchema as any).required = required.filter((key: string) => !nullableKeys.has(key));
    }
  }
  return jsonSchema as any;
};

export const createSchema = (props: {
  uiSchema: any;
  tableSchema?: JsonSchema;
  filterSchema?: JsonSchema;
  schema: ZodObject<any>;
  dtoSchema: ZodObject<any>;
  responseSchema?: ZodObject<any>;
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
