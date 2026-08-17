import { z } from 'zod';

import {
  CalculatedColumnSchema,
  JsonActionSchema,
  JsonIncludeEntrySchema,
  JsonOperationsSchema, ViewConfigSchema 
} from '@ghentcdh/crouton-core';


import { ValueLabelColumnSchema } from './valueLabel';
import { CustomRepositorySchema } from '../custom-repository/custom-repository.types';
import { ResourceHooksSchema } from '../hooks';

export const SubResourceConfigSchema = z.object({
  /** Column id in the parent resource that holds the count, e.g. `"text_author"`. */
  column: z.string(),
  /** Prisma relation field name on the parent model, e.g. `"text_author"`. */
  relation: z.string(),
  /** Route segment for the sub-resource endpoint, e.g. `"author"`. */
  childRoute: z.string(),
  /**
   * Where the child's data comes from. `custom` means the child declares
   * `kind: "custom"` and brings its own `repository.ts`; the parent's Prisma
   * repository then delegates to it instead of querying `childModel`.
   */
  childKind: z.enum(['prisma', 'custom']).default('prisma'),
  /**
   * Absolute path to the child's resource directory. Only needed for a custom
   * child, so the loader can find its `repository.ts`.
   */
  childDir: z.string().optional(),
  /**
   * Data access for a custom child, loaded from its `repository.ts`. Attached
   * by the loader — see `loadSubResourceRepositories`.
   */
  repository: CustomRepositorySchema.optional(),
  /**
   * Prisma model name of the child, e.g. `"text_author"`.
   * Empty for a custom child, which has no model.
   */
  childModel: z.string(),
  /** FK field on the child model pointing back to the parent, e.g. `"text_id"`. */
  foreignKey: z.string(),
  /** Human-readable name for the child resource. */
  name: z.string().optional(),
  /** Display title for the child resource. */
  title: z.string().optional(),
  /** Primary key field name on the child model. */
  idField: z.string().optional(),
  /** Primary key type on the child model. */
  idType: z.enum(['string', 'number']).optional(),
  /** View schemas (table/form/view) for the child resource. */
  views: z.record(z.string(), ViewConfigSchema).optional(),
  /** Enabled operations on the child resource. */
  operations: JsonOperationsSchema,
  /** Actions declared in the child resource.json (serializable form, no procedure functions). */
  actions: z.array(JsonActionSchema).optional(),
  /** Modal width when opening a form for this sub-resource. */
  modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).optional(),
  /** Relations to include when querying this sub-resource. Supports nested includes — see `JsonIncludeEntry`. */
  include: z.array(JsonIncludeEntrySchema).optional(),
  /** Calculated columns to compute and merge for each row of this sub-resource. */
  calculatedColumns: z.array(CalculatedColumnSchema).optional(),
  /** When true, the relation is included in findOne responses (column is visible in form or view). */
  includeInFindOne: z.boolean().optional(),
  /** Prisma orderBy clause for auto-included relations (from fieldInput.options.sort). */
  findOneOrderBy: z.record(z.string(), z.unknown()).optional(),
  /** Lifecycle hooks for this sub-resource (beforeWrite, afterRead). */
  hooks: ResourceHooksSchema.optional(),
  /** Columns serialized as `{ value, label }` on read / unwrapped on write. */
  valueLabelColumns: z.array(ValueLabelColumnSchema).optional(),
  /** Relation type: `oneToMany` (countable) or `manyToOne` (not countable). */
  relationType: z.enum(['oneToMany', 'manyToOne']).optional(),
});

export type SubResourceConfig = z.infer<typeof SubResourceConfigSchema>;
