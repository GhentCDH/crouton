import { z } from 'zod';
// ── Operations ────────────────────────────────────────────────────────

const BoolOrUpsertSchema = z.union([
  z.boolean(),
  z.object({ upsertOn: z.union([z.string(), z.array(z.string())]) }),
]);

export const JsonOperationsSchema = z.object({
  findAll: z.boolean().optional(), // default: true — only explicit `false` disables it
  findOne: z.boolean().optional(), // default: true
  create: z.boolean().optional(), // default: true
  update: z.boolean().optional(), // default: true
  upsert: BoolOrUpsertSchema.optional(), // default: disabled; `true` throws at load time — must be `{ upsertOn }`
  delete: z.boolean().optional(), // default: true
});

export type JsonResourceOperations = z.infer<typeof JsonOperationsSchema>;
