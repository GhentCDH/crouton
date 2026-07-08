import { z } from 'zod';

import { uiFromJsonSchema } from '@ghentcdh/crouton-core';

import type { HttpClient } from '../../../http-client';

/** Supported HTTP methods for resource operations. */
export const MethodSchema = z.enum([
  'get',
  'post',
  'delete',
  'put',
  'patch',
  'GET',
  'POST',
  'DELETE',
  'PUT',
  'PATCH',
]);
export type Method = z.infer<typeof MethodSchema>;
export const OperationSchema = z.object({
  uri: z.string(),
  method: MethodSchema,
});
export type Operation = z.infer<typeof OperationSchema>;
export const OperationsSchema = z.string().or(OperationSchema);
export const BooleanOperationSchema = z
  .boolean()
  .or(OperationSchema)
  .optional()
  .default(false);

const Operations = z.object({
  findAll: BooleanOperationSchema,
  findOne: BooleanOperationSchema,
  create: BooleanOperationSchema,
  update: BooleanOperationSchema,
  delete: BooleanOperationSchema,
  lookup: OperationsSchema.optional(),
});

type OperationKey = keyof z.infer<typeof Operations>;
const OperationMap: Record<OperationKey, Method> = {
  create: 'post',
  delete: 'delete',
  findAll: 'get',
  findOne: 'get',
  lookup: 'get',
  update: 'patch',
};

const schemaDef = z.object({
  ui: z.any().optional(),
  data: z.any(),
});

/**
 * Zod schema that validates and transforms a resource definition from the API.
 *
 * Accepts a resource descriptor with an `id`, base `uri`, CRUD `operations`,
 * and optional `schema` (JSON Schema + UI schema). During parsing:
 *
 * - If `schema.data` is present but `schema.ui` is missing, a UI schema is
 *   auto-generated via {@link uiFromJsonSchema} using a GridLayout.
 * - Each operation is normalized to `{ uri, method }` or `null` based on
 *   its value (`true` inherits the base uri, a string overrides the uri,
 *   an object is used as-is, `false`/`undefined` maps to `null`).
 */
export const ResourceSchema = z
  .object({
    id: z.string(),
    uri: z.string(),
    operations: Operations,
    schema: schemaDef.optional(),
    schemas: z
      .object({
        form: schemaDef.optional(),
      })
      .optional(),
  })
  .transform((data) => {
    const schema = data.schema ??
      data.schemas?.form ?? { ui: undefined, data: undefined };

    if (!schema.ui && schema.data) {
      schema.ui = uiFromJsonSchema(schema.data);
    }

    const operations = {} as Record<OperationKey, Operation | null>;

    for (const k in OperationMap) {
      const key = k as OperationKey;
      const defaultOperation = OperationMap[key];
      const operation = data.operations[key];

      const mapResourceSchema = () => {
        if (operation === undefined || operation === false) return null;

        if (operation === true)
          return { uri: data.uri, method: defaultOperation } as Operation;
        if (typeof operation === 'string')
          return { uri: operation, method: 'get' } as Operation;
        return {
          uri: operation.uri,
          method: (operation.method?.toLowerCase() ??
            defaultOperation) as Method,
        };
      };

      operations[key] = mapResourceSchema();
    }

    return {
      ...data,
      schema,
      operations,
    };
  });

/**
 * Fetches and validates a resource definition from the given URI.
 *
 * @param resourceUri - Endpoint that returns the resource descriptor JSON.
 * @param skipAuth - When `true`, uses plain axios instead of the authenticated API client.
 * @returns Parsed and normalized resource with resolved operations and schemas.
 * @throws If the response does not match {@link ResourceSchema}.
 */
export const getResourceSchema = async (
  resourceUri: string,
  http: HttpClient,
) => {
  return http.get(resourceUri).then((response) => {
    const resource = ResourceSchema.safeParse(response.data);
    if (!resource.success) {
      console.error(resource.error);
      throw new Error(`Invalid resource schema: ${resourceUri}`);
    }
    return resource.data;
  });
};
