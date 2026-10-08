import { z } from 'zod';

export const SecuritySchema = z.union([
  z.object({ public: z.literal(true).describe('When true, the route is public and requires no authentication.') }),
  z.object({ guard: z.union([z.string(), z.array(z.string()).min(1)]).describe('Named guard(s) that must all pass (AND logic). A single string or an array of guard names.') }),
]);

export type SecurityConfig = z.infer<typeof SecuritySchema>;
