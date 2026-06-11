import type { ZodObject, ZodRawShape } from 'zod';

import type { JsonResourceConfig } from './json-config.types';
import type { ResourceConfig, ResourceHooks } from '../crud.config';

export type ResourceGlobs = {
  tsResources: Record<string, { default: ResourceConfig }>;
  jsonResources: Record<string, JsonResourceConfig>;
  schemaModules: Record<string, { default: ZodObject<ZodRawShape> }>;
  hookModules: Record<string, { default: ResourceHooks }>;
};
