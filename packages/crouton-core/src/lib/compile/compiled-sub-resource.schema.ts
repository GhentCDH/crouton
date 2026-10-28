import { z } from 'zod';

import { JsonOperationsSchema } from '../data-source';
import {
  JsonActionSchema,
  RelationType,
  ResourceKindSchema,
} from '../resource';
import {
  IdTypeSchema,
  ModalSizeSchema,
  OptionalCalculatedColumnsSchema,
  OptionalIncludeListSchema,
  OptionalValueLabelColumnsSchema,
  OptionalViewsSchema,
} from './compiled-shared.schema';

export const CompiledSubResourceConfigSchema = z.object({
  column: z.string(),
  relation: z.string(),
  childRoute: z.string(),
  childKind: ResourceKindSchema,
  childDir: z.string().optional(),
  childModel: z.string(),
  childTable: z.string().optional(),
  foreignKey: z.string(),
  name: z.string().optional(),
  title: z.string().optional(),
  idField: z.string().optional(),
  idType: IdTypeSchema.default('string'),
  views: OptionalViewsSchema,
  operations: JsonOperationsSchema,
  actions: z.array(JsonActionSchema).optional(),
  modalSize: ModalSizeSchema.optional(),
  /** Child relations eager-loaded by the child's own read/write queries. */
  childInclude: OptionalIncludeListSchema,
  calculatedColumns: OptionalCalculatedColumnsSchema,
  /** Include the relation itself when the parent is fetched with findOne. */
  includeRelationInParentFindOne: z.boolean().optional(),
  hiddenInTable: z.boolean().optional(),
  findOneOrderBy: z.record(z.string(), z.unknown()).optional(),
  valueLabelColumns: OptionalValueLabelColumnsSchema,
  relationType: RelationType.optional(),
  /** Display field name on the child model used for filter/search remapping (e.g. `"name"`). */
  displayKey: z.string().optional(),
  layout: z.record(z.string(), z.unknown()).optional(),
  rowActions: z.array(JsonActionSchema).optional(),
  tableActions: z.array(JsonActionSchema).optional(),
});

export type CompiledSubResourceConfig = z.infer<typeof CompiledSubResourceConfigSchema>;
