import { z } from 'zod';

import { JsonIncludeEntrySchema, ResourceJsonShape } from '../resource';
import { ViewConfigSchema } from '../view';
import { CompiledSubResourceConfigSchema } from './compiled-sub-resource.schema';
import { LookupSchema } from './lookup.schema';

export const CompiledResourceSchema = ResourceJsonShape.extend({
  route: z.string(),
  // TODO what is this?
  // valueLabelColumns: z.array(ValueLabelColumnSchema).default([]),
  subResources: z
    .lazy(() => z.array(CompiledSubResourceConfigSchema))
    .default([]),
  // TODO Is this still valid shemas?
  // search: z.array(z.string()).optional(),
  // TODO Is this still valid
  lookup: LookupSchema.optional(),
  // TODO Is this still valid schemas?
  views: z.record(z.string(), ViewConfigSchema),
  // definition: DefinitionSchema,
  // TODO should be moved to source
  idField: z.string(),
  // TODO remove me!
  // Derived from layout.form.container / layout.view.container at compile time (Block 2)
  // display: JsonDisplaySchema.optional(),
  // TODO remove me!
  // modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).optional(),
  /** Eager-loaded relations for findAll (list) queries. From operations.findAll.include. */
  // TODO remove it moved to operations
  // include: z.array(JsonIncludeEntrySchema).optional(),
  /** Eager-loaded relations for findOne (detail) queries. From operations.findOne.include. */
  // TODO what is this?
  findOneInclude: z.array(JsonIncludeEntrySchema).optional(),
  /** Prisma model name (flattened from source.model). */
  // TODO remove it moved to source
  model: z.string().optional(),
  /** Database table name override (flattened from source.dbTable). */
  // TODO remove it moved to source
  // table: z.string().optional(),
  /** Datasource name (flattened from source.datasource). */
  // TODO remove it moved to source
  // database: z.string().optional(),
  // TODO check usage
  /** Primary key type (flattened from source.idType). */
  // TODO check usage
  // idType: z.enum(['string', 'number']).optional(),
});

export type CompiledResource = z.infer<typeof CompiledResourceSchema>;
