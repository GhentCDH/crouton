import type { CanActivate, Type } from '@nestjs/common';
import type { ZodType } from 'zod';

import type { SecurityConfig } from '@ghentcdh/crouton-core';

export type CroutonAppConfig = {
  baseUrl: string;
  /** URL path prefix prepended to every crouton controller route (e.g. `'api'`). */
  prefix?: string;
  /** Named security guards and an optional module-level default. */
  security?: {
    /** Map of guard name → NestJS guard class (e.g. `{ admin: AdminGuard }`). */
    guards: Record<string, Type<CanActivate>>;
    /** Applied when neither the operation nor the resource declares security. */
    default?: SecurityConfig;
  };
  /** App-defined resource.json extension sections, keyed by top-level name. */
  extensions?: Record<string, ZodType>;
  /**
   * Called on every schema-serving request (`GET /schemas`, `/definition`,
   * `/resource.json`) with the built payload; its return value is spread into
   * the payload.
   */
  schemaEnricher?: <T extends Record<string, unknown>>(
    schema: T,
  ) => Record<string, unknown>;
};
