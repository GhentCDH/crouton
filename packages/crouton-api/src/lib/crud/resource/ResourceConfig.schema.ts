import { z } from 'zod';

import { ResourceJsonShape, ViewConfigSchema } from '@ghentcdh/crouton-core';

import { SubResourceConfigSchema } from './SubResource.schema';
import { DefinitionSchema } from './defintion.schema';
import { LookupSchema } from './lookup.schema';
import { ValueLabelColumnSchema } from './valueLabel';
import {
  ResourceRowActionSchema,
  ResourceTableActionSchema,
} from '../action/action.types';
import { CustomRepositorySchema } from '../custom-repository/custom-repository.types';
import { ResourceHooksSchema } from '../hooks';

export const ResourceSchema = ResourceJsonShape.extend({
  /** Always resolved (via `route ?? id ?? name`) before a Resource is constructed. */
  route: z.string(),
  /** Columns serialized as `{ value, label }` on read / unwrapped on write. */
  valueLabelColumns: z.array(ValueLabelColumnSchema).default([]),
  actions: z.array(ResourceRowActionSchema).default([]),
  /** Global table-level actions (no record id). Shown as toolbar buttons. */
  tableActions: z.array(ResourceTableActionSchema).default([]),
  subResources: z.lazy(() => z.array(SubResourceConfigSchema)).default([]),
  lookup: LookupSchema.optional(),
  views: z.record(z.string(), ViewConfigSchema),
  definition: DefinitionSchema,
  /** Lifecycle hooks for this sub-resource (beforeWrite, afterRead). */
  hooks: ResourceHooksSchema.optional(),
  /**
   * Data access for a `kind: "custom"` resource, loaded from `repository.ts`.
   * Never set on a prisma resource.
   */
  repository: CustomRepositorySchema.optional(),

  /** Primary key field name on the model. Defaults to `"id"`. */
  idField: z.string(),
  idType: z.enum(['string', 'number']).default('string'),
});

export type Resource = z.infer<typeof ResourceSchema>;
