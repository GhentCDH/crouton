import { z } from 'zod';

/** Public route, or one/more named guards that must all pass (AND). */
export const SecuritySchema = z.union([
  z.object({ public: z.literal(true) }),
  z.object({ guard: z.union([z.string(), z.array(z.string()).min(1)]) }),
]);

export type SecurityConfig = z.infer<typeof SecuritySchema>;
