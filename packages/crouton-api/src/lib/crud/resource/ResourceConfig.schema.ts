import { z } from 'zod';

import {
  CompiledResourceSchema,
  ResourceRowActionSchema,
  ResourceTableActionSchema,
} from '@ghentcdh/crouton-core';

import { SubResourceConfigSchema } from './SubResource.schema';
import { CustomRepositorySchema } from '../custom-repository';
import { ResourceHooksSchema } from '../hooks';

export const ResourceSchema = CompiledResourceSchema.extend({
  subResources: z.lazy(() => z.array(SubResourceConfigSchema)).default([]),
  /** Lifecycle hooks for this sub-resource (beforeWrite, afterRead). */
  hooks: ResourceHooksSchema.optional(),
  /** Row-level actions loaded from `actions/` at startup. Procedures are live functions. */
  actions: z.array(ResourceRowActionSchema).default([]),
  /** Table-level actions loaded from `actions/` at startup. Procedures are live functions. */
  tableActions: z.array(ResourceTableActionSchema).default([]),
  /**
   * Data access for a `kind: "custom"` resource, loaded from `repository.ts` at startup.
   * Lives here (not in source) because it is a runtime-loaded module, not resource.json config.
   * Never set on a prisma resource.
   */
  repository: CustomRepositorySchema.optional(),
});

export type Resource = z.infer<typeof ResourceSchema>;
