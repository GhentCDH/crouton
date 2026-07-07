import { z } from 'zod';

import { ResourceJsonShape } from '@ghentcdh/crouton-core';

import { SubResourceConfigSchema } from './SubResource.schema';
import { DefinitionSchema } from './defintion.schema';
import { LookupSchema } from './lookup.schema';
import { ValueLabelColumnSchema } from './valueLabel';
import { ViewConfigSchema } from './view.schema';
import {
  ResourceRowActionSchema,
  ResourceTableActionSchema,
} from '../action/action.types';
import { ResourceHooksSchema } from '../hooks';

export const ResourceSchema = ResourceJsonShape.extend({
  /** Columns serialized as `{ value, label }` on read / unwrapped on write. */
  valueLabelColumns: z.array(ValueLabelColumnSchema).default([]),
  actions: z.array(ResourceRowActionSchema).default([]),
  /** Global table-level actions (no record id). Shown as toolbar buttons. */
  tableActions: z.array(ResourceTableActionSchema).default([]),
  subResources: z.array(SubResourceConfigSchema).default([]),
  lookup: LookupSchema.optional(),
  views: z.record(z.string(), ViewConfigSchema),
  definition: DefinitionSchema,
  /** Lifecycle hooks for this sub-resource (beforeWrite, afterRead). */
  hooks: ResourceHooksSchema.optional(),

  /** Primary key field name on the model. Defaults to `"id"`. */
  idField: z.string(),
  idType: z.enum(['string', 'number']).default('string'),
});

export type Resource = z.infer<typeof ResourceSchema>;
