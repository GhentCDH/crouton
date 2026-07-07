import { z, ZodObject, ZodRawShape } from 'zod';

export const JsonSchemaInputSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.string(), z.unknown()),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional(),
});

export type JsonSchemaInput = z.infer<typeof JsonSchemaInputSchema>;

export const SchemaInputSchema = z.union([
  z.custom<ZodObject<ZodRawShape>>((val) => val instanceof ZodObject),
  JsonSchemaInputSchema,
]);

export type SchemaInput = z.infer<typeof SchemaInputSchema>;
