import { z } from 'zod';

import { JsonIncludeEntrySchema, ResourceJsonShape } from '../resource';
import { CrudDefinitionSchema, LookupSchema } from '../schema/definition';
import { ViewConfigSchema } from '../view';
import { CompiledSubResourceConfigSchema } from './compiled-sub-resource.schema';
import { ValueLabelColumnSchema } from './value-label-column';

export const CompiledResourceSchema = ResourceJsonShape.extend({
  route: z.string(),
  /** Columns that map a FK value → display label. Built from columns with `valueLabel`. */
  valueLabelColumns: z.array(ValueLabelColumnSchema).default([]),
  subResources: z
    .lazy(() => z.array(CompiledSubResourceConfigSchema))
    .default([]),
  lookup: LookupSchema.optional(),
  views: z.record(z.string(), ViewConfigSchema),
  definition: CrudDefinitionSchema,
  idField: z.string(),
  /**
   * Eager-loaded relations for findOne (detail) queries.
   * Derived from operations.findOne.include, enriched with sort at compile time.
   * Cannot be derived lazily — sort enrichment depends on compiled column data.
   */
  findOneInclude: z.array(JsonIncludeEntrySchema).optional(),
  /**
   * Prisma model name, flattened from source.model at compile time.
   * Used by the Prisma adapter to address the correct delegate.
   * Remove once source-flattening is complete and adapters read source directly.
   */
  model: z.string().optional(),
});

export type CompiledResource = z.infer<typeof CompiledResourceSchema>;
