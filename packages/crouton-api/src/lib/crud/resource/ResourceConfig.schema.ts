import { z } from 'zod';

import { CompiledResourceSchema } from '@ghentcdh/crouton-core';

import { SubResourceConfigSchema } from './SubResource.schema';
import { CustomRepositorySchema } from '../custom-repository';
import { ResourceHooksSchema } from '../hooks';

export const ResourceSchema = CompiledResourceSchema.extend({
  subResources: z.lazy(() => z.array(SubResourceConfigSchema)).default([]),
  /** Lifecycle hooks for this sub-resource (beforeWrite, afterRead). */
  hooks: ResourceHooksSchema.optional(),
  /**
   * Data access for a `kind: "custom"` resource, loaded from `repository.ts`.
   * Never set on a prisma resource.
   */
  // TODO Is should this not be part of the source?
  repository: CustomRepositorySchema.optional(),
});

export type Resource = z.infer<typeof ResourceSchema>;
