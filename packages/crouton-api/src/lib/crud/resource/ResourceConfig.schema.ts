import { z } from 'zod';

import { CompiledResourceSchema } from '@ghentcdh/crouton-core';

import { SubResourceConfigSchema } from './SubResource.schema';
import { CustomRepositorySchema } from '../custom-repository';
import { ResourceHooksSchema } from '../hooks';

export const ResourceSchema = CompiledResourceSchema.extend({
  /**
   * Loader-only flag for the `resource.ts` escape hatch: the loader reads it
   * before validating/registering the resource. The JSON path reads raw
   * `draft` before compiling, so this is not part of the compiled output.
   */
  draft: z.boolean().optional(),
  subResources: z.lazy(() => z.array(SubResourceConfigSchema)).default([]),
  /** Lifecycle hooks for this sub-resource (beforeWrite, afterRead). */
  hooks: ResourceHooksSchema.optional(),
  /**
   * Data access for a `kind: "custom"` resource, loaded from `repository.ts`.
   * Never set on a prisma resource.
   */
  repository: CustomRepositorySchema.optional(),
});

export type Resource = z.infer<typeof ResourceSchema>;
