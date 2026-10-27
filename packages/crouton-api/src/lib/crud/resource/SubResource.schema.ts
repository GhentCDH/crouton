import type { z } from 'zod';

import { CompiledSubResourceConfigSchema } from '@ghentcdh/crouton-core';

import { CustomRepositorySchema } from '../custom-repository';
import { ResourceHooksSchema } from '../hooks';

export const SubResourceConfigSchema = CompiledSubResourceConfigSchema.extend({
  /**
   * Data access for a custom child, loaded from its `repository.ts`. Attached
   * by the loader — see `loadSubResourceRepositories`.
   */
  repository: CustomRepositorySchema.optional(),
  /** Lifecycle hooks for this sub-resource (beforeWrite, afterRead). */
  hooks: ResourceHooksSchema.optional(),
});

export type SubResourceConfig = z.infer<typeof SubResourceConfigSchema>;
