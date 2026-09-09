import { z } from 'zod';

import { ResourceJsonShape } from '../resource';
import { ViewConfigSchema } from '../view';
import { CompiledSubResourceConfigSchema } from './compiled-sub-resource.schema';
import { DefinitionSchema } from './definition.schema';
import { LookupSchema } from './lookup.schema';
import { ValueLabelColumnSchema } from './value-label-column';

export const CompiledResourceSchema = ResourceJsonShape.extend({
  route: z.string(),
  valueLabelColumns: z.array(ValueLabelColumnSchema).default([]),
  subResources: z.lazy(() => z.array(CompiledSubResourceConfigSchema)).default([]),
  lookup: LookupSchema.optional(),
  views: z.record(z.string(), ViewConfigSchema),
  definition: DefinitionSchema,
  idField: z.string(),
  idType: z.enum(['string', 'number']).default('string'),
});

export type CompiledResource = z.infer<typeof CompiledResourceSchema>;
