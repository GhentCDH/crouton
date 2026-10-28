import { z } from 'zod';

import { JsonOperationsSchema } from '../data-source';
import {
  CalculatedColumnSchema,
  JsonActionSchema,
  JsonIncludeEntrySchema,
} from '../resource';
import { ViewConfigSchema } from '../view';
import { ValueLabelColumnSchema } from './value-label-column';

export const CompiledSubResourceConfigSchema = z.object({
  column: z.string(),
  relation: z.string(),
  childRoute: z.string(),
  childKind: z.enum(['prisma', 'custom']).default('prisma'),
  childDir: z.string().optional(),
  childModel: z.string(),
  childTable: z.string().optional(),
  foreignKey: z.string(),
  name: z.string().optional(),
  title: z.string().optional(),
  idField: z.string().optional(),
  idType: z.enum(['string', 'number']).optional(),
  views: z.record(z.string(), ViewConfigSchema).optional(),
  operations: JsonOperationsSchema,
  actions: z.array(JsonActionSchema).optional(),
  modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).optional(),
  include: z.array(JsonIncludeEntrySchema).optional(),
  calculatedColumns: z.array(CalculatedColumnSchema).optional(),
  includeInFindOne: z.boolean().optional(),
  hiddenInTable: z.boolean().optional(),
  findOneOrderBy: z.record(z.string(), z.unknown()).optional(),
  valueLabelColumns: z.array(ValueLabelColumnSchema).optional(),
  relationType: z.enum(['oneToMany', 'manyToOne', 'manyToMany', 'oneToOne']).optional(),
  /** Display field name on the child model used for filter/search remapping (e.g. `"name"`). */
  displayKey: z.string().optional(),
  layout: z.record(z.string(), z.unknown()).optional(),
  rowActions: z.array(JsonActionSchema).optional(),
  tableActions: z.array(JsonActionSchema).optional(),
});

export type CompiledSubResourceConfig = z.infer<typeof CompiledSubResourceConfigSchema>;
