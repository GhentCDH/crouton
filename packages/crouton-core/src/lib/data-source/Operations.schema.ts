import { z } from 'zod';
// ── Operations ────────────────────────────────────────────────────────

const BoolOrUpsertSchema = z.union([
  z.boolean(),
  z.object({ upsertOn: z.union([z.string(), z.array(z.string())]) }),
]);

export const JsonOperationsSchema = z.object({
  findAll: z.boolean().default(true), // default: true — only explicit `false` disables it
  findOne: z.boolean().default(true), // default: true
  create: z.boolean().default(true), // default: true
  update: z.boolean().default(true), // default: true
  patch: z.boolean().default(true), // default: true
  upsert: BoolOrUpsertSchema.default(false), // default: disabled; `true` throws at load time — must be `{ upsertOn }`
  delete: z.boolean().default(true), // default: true
});

export type JsonResourceOperations = z.infer<typeof JsonOperationsSchema>;
export type JsonResourceOperationsInput = z.input<typeof JsonOperationsSchema>;
