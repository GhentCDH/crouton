import { z } from 'zod';

import { SecuritySchema } from './Security.schema';

// ── Operations ────────────────────────────────────────────────────────

/** A standard operation entry: plain boolean or an object with optional security. */
const OpEntry = z.union([
  z.boolean(),
  z.object({ security: SecuritySchema.optional() }),
]);

const BoolOrUpsertSchema = z.union([
  z.boolean(),
  z.object({
    upsertOn: z.union([z.string(), z.array(z.string())]),
    security: SecuritySchema.optional(),
  }),
]);

export const JsonOperationsSchema = z.object({
  findAll: OpEntry.default(true), // default: true — only explicit `false` disables it
  findOne: OpEntry.default(true), // default: true
  create: OpEntry.default(true), // default: true
  update: OpEntry.default(true), // default: true
  patch: OpEntry.default(true), // default: true
  upsert: BoolOrUpsertSchema.default(false), // default: disabled; `true` throws at load time — must be `{ upsertOn }`
  delete: OpEntry.default(true), // default: true
});

export type JsonResourceOperations = z.infer<typeof JsonOperationsSchema>;
export type JsonResourceOperationsInput = z.input<typeof JsonOperationsSchema>;
