import { z } from 'zod';

export const RelationType = z.enum([
  'oneToOne',
  'manyToOne',
  'oneToMany',
  'manyToMany',
]);

export const DetailControlSchema = z.object({
  property: z.string(), // required
  type: z.string().optional(), // default: 'text'
  options: z.record(z.string(), z.unknown()).optional(),
  hideLabel: z.boolean().optional(), // default: false
  width: z.string().optional(),
});

export const DetailConfigSchema = z.object({
  layout: z.enum(['collapse', 'row']), // required
  titleKey: z.string().optional(),
  controls: z.array(DetailControlSchema), // required
});

export const RelationFieldInputOptionsSchema = z
  .object({
    sort: z.string().optional(),
    sortDir: z.enum(['asc', 'desc']).optional(), // default: 'asc'
    direction: z.string().optional(),
    displayKey: z.string().optional(),
    resource: z.string().optional(),
  })
  .catchall(z.unknown()); // arbitrary extra keys allowed (e.g. colspan, emitObject, values)

export const FieldInputSchema = z.object({
  type: z.string().optional(),
  customRender: z.string().optional(),
  format: z.string().optional(), // 'relation' triggers relation handling; requires `resource`
  resource: z.string().optional(), // required when format === 'relation'
  relationType: RelationType.optional(), // auto-derived from the Zod model/sibling FK column if omitted
  position: z.number().optional(), // default: source order
  options: z.union([RelationFieldInputOptionsSchema, z.unknown()]).optional(),
  detail: DetailConfigSchema.optional(),
});
