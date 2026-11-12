import { z } from 'zod';

import { JsonOperationsSchema } from '../data-source';
import {
  JsonActionSchema,
  RelationType,
  ResourceKindSchema,
} from '../resource';
import { JsonColumnSchema } from '../resource/Column';
import {
  IdTypeSchema,
  OptionalCalculatedColumnsSchema,
  OptionalIncludeListSchema,
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
  /** Child relations eager-loaded by the child's own read/write queries. */
  childInclude: OptionalIncludeListSchema,
  calculatedColumns: OptionalCalculatedColumnsSchema,
  /** Include the relation itself when the parent is fetched with findOne. */
  includeRelationInParentFindOne: z.boolean().optional(),
  hiddenInTable: z.boolean().optional(),
  findOneOrderBy: z.record(z.string(), z.unknown()).optional(),
  /** Child column definitions (enriched). Runtime consumers derive value-label decoration from these. */
  columns: z.array(JsonColumnSchema).optional(),
  relationType: RelationType.optional(),
  /** Display field name on the child model used for filter/search remapping (e.g. `"name"`). */
  displayKey: z.string().optional(),
  /** Dot-paths that child ?q= matches against. Derived from operations.findAll.search on the child resource. */
  search: z.array(z.string()).optional(),
  layout: z.record(z.string(), z.unknown()).optional(),
  rowActions: z.array(JsonActionSchema).optional(),
  tableActions: z.array(JsonActionSchema).optional(),
  /**
   * When true the child mounts its own routes (via `parent` block) — the
   * parent's controller must NOT register duplicate routes for it, but the
   * descriptor is kept so the relation-loader can embed the child's data.
   */
  noRoutes: z.boolean().optional(),
});

export type CompiledSubResourceConfig = z.infer<typeof CompiledSubResourceConfigSchema>;
