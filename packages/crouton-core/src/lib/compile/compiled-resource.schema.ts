import { z } from 'zod';

import { JsonDisplaySchema, ResourceJsonShape } from '../resource';
import { ViewConfigSchema } from '../view';
import { CompiledSubResourceConfigSchema } from './compiled-sub-resource.schema';
import { DefinitionSchema } from './definition.schema';
import { LookupSchema } from './lookup.schema';
import { ValueLabelColumnSchema } from './value-label-column';

export const CompiledResourceSchema = ResourceJsonShape.extend({
  route: z.string(),
  valueLabelColumns: z.array(ValueLabelColumnSchema).default([]),
  subResources: z.lazy(() => z.array(CompiledSubResourceConfigSchema)).default([]),
  search: z.array(z.string()).optional(),
  lookup: LookupSchema.optional(),
  views: z.record(z.string(), ViewConfigSchema),
  definition: DefinitionSchema,
  idField: z.string(),
  idType: z.enum(['string', 'number']).default('string'),
  // Derived from layout.form.container / layout.view.container at compile time (Block 2)
  display: JsonDisplaySchema.optional(),
  modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).optional(),
});

export type CompiledResource = z.infer<typeof CompiledResourceSchema>;
