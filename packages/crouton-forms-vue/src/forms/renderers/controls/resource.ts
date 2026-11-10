import type { JsonSchema } from '@jsonforms/core';
import { z } from 'zod';

import type { Method, Operation } from '@ghentcdh/crouton-core';
import {
  BooleanOperationSchema,
  OperationSchema,
  parseSchema,
  uiFromJsonSchema,
} from '@ghentcdh/crouton-core';

import type { HttpClient } from '../../../http-client';

const OperationsSchema = z.string().or(OperationSchema);

const Operations = z.object({
  findAll: BooleanOperationSchema,
  findOne: BooleanOperationSchema,
  create: BooleanOperationSchema,
  update: BooleanOperationSchema,
  patch: BooleanOperationSchema,
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
  update: 'put',
  patch: 'patch',
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
const ResourceSchema = z
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
      schema.ui = uiFromJsonSchema(schema.data as JsonSchema);
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
const resourceSchemaCache = new Map<
  string,
  Promise<z.infer<typeof ResourceSchema>>
>();

/** Drop every cached resource descriptor. Call when a resource definition changes. */
/** @internal test seam — clears the resource-schema cache between specs. */
export const clearResourceSchemaCache = () => {
  resourceSchemaCache.clear();
};

// TODO this should be moved to usecrouton
export const getResourceSchema = async (
  resourceUri: string,
  http: HttpClient,
) => {
  const cached = resourceSchemaCache.get(resourceUri);
  if (cached) return cached;

  const request = http
    .get(resourceUri)
    .then((response) => {
      let resourceSchema = response.data as Record<string, unknown>;

      if ((resourceSchema as { columns?: unknown }).columns) {
        resourceSchema = parseSchema(resourceSchema, {}) as Record<string, unknown>;
      }

      const resource = ResourceSchema.safeParse(resourceSchema);
      if (!resource.success) {
        console.error(resource.error);
        throw new Error(`Invalid resource schema: ${resourceUri}`);
      }
      return resource.data;
    })
    .catch((error) => {
      // Do not cache failures – the next call should retry.
      resourceSchemaCache.delete(resourceUri);
      throw error;
    });

  resourceSchemaCache.set(resourceUri, request);
  return request;
};
