import { z } from 'zod';

import { SchemaInputSchema } from './schema-input';
import { SecuritySchema } from '../data-source/Security.schema';


export type { JsonSchemaInput, SchemaInput } from './schema-input';

const ExternalOperationDefSchema = z.object({
  route: z.string(),
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

const UpsertOperationDefSchema = z.object({
  schema: SchemaInputSchema.optional(),
  upsertOn: z.union([z.string(), z.array(z.string())]),
  security: SecuritySchema.optional(),
});

export type UpsertOperationDef = z.infer<typeof UpsertOperationDefSchema>;
export type PatchOperationDef = z.infer<typeof OperationDefSchema>;

export const ResourceDefinitionSchema = z.object({
  findAll: OperationDefSchema.optional(),
  findOne: OperationDefSchema.optional(),
  create: OperationDefSchema.optional(),
  update: OperationDefSchema.optional(),
  patch: OperationDefSchema.optional(),
  upsert: UpsertOperationDefSchema.optional(),
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
