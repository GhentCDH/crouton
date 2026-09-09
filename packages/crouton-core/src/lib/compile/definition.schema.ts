import { z } from 'zod';

import { SchemaInputSchema } from './schema-input';
import { SecuritySchema } from '../data-source/Security.schema';


export type { JsonSchemaInput, SchemaInput } from './schema-input';

const ExternalOperationDefSchema = z.object({
  uri: z.string(),
  method: z.string().optional(),
});

const OperationDefSchema = z.union([
  z.literal(true),
  ExternalOperationDefSchema,
  z.object({
    schema: SchemaInputSchema.optional(),
    security: SecuritySchema.optional(),
  }),
]);

export type OperationDef = z.infer<typeof OperationDefSchema>;

export type PatchOperationDef = z.infer<typeof OperationDefSchema>;

export const ResourceDefinitionSchema = z.object({
  findAll: OperationDefSchema.optional(),
  findOne: OperationDefSchema.optional(),
  create: OperationDefSchema.optional(),
  update: OperationDefSchema.optional(),
  patch: OperationDefSchema.optional(),
  delete: OperationDefSchema.optional(),
});

export type ResourceDefinition = z.infer<typeof ResourceDefinitionSchema>;

const DefinitionCallbackSchema = z.function({
  input: [],
  output: ResourceDefinitionSchema,
});

export type DefinitionCallback = () => ResourceDefinition;

export const DefinitionSchema = z.union([
  ResourceDefinitionSchema,
  DefinitionCallbackSchema,
]);
