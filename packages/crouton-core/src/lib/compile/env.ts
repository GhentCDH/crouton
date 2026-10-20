import type { ZodObject, ZodRawShape } from 'zod';

import type { ResourceJson } from '../resource';

// Frozen stub — implementation lives in crouton-codegen (fs env) and crouton-api (Prisma env)
export interface CompileEnv {
  /** Resolve a resource.json by route name, for cross-resource features (extend columns, sub-resources) */
  resolveResource: (route: string) => Promise<ResourceJson | undefined>;
  /** Resolve the Zod schema for a resource by route name */
  resolveSchema: (route: string) => Promise<ZodObject<ZodRawShape> | undefined>;
  /** Base URL forwarded to operation URI builders */
  baseUrl?: string;
}
