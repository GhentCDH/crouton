import { z } from 'zod';

type ToJSONSchemaParams = NonNullable<
  Parameters<typeof import('zod').toJSONSchema>[1]
>;
type OverrideContext = Parameters<
  NonNullable<ToJSONSchemaParams['override']>
>[0];

/** Post-process override: patch date schemas to `{ type: "string", format: "date-time" }`. */
const dateOverride = ({ zodSchema, jsonSchema }: OverrideContext) => {
  if (zodSchema instanceof z.ZodDate) {
    jsonSchema.type = 'string';
    jsonSchema.format = 'date-time';
  }
};

export const jsonSchemaOpts = {
  unrepresentable: 'any' as const,
  override: dateOverride,
};
