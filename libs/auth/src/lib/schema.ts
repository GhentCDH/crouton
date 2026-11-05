import { z } from 'zod';

const RoleGuardSchema = z.union([
  z.array(z.string()).min(1),
  z.object({ anyOf: z.array(z.string()).min(1), allOf: z.array(z.string()).min(1).optional() }),
  z.object({ allOf: z.array(z.string()).min(1), anyOf: z.array(z.string()).min(1).optional() }),
]);

export const AuthProviderSchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  provider: z.enum(['keycloak', 'auth0', 'google', 'microsoft', 'oidc', 'dev', 'custom']),
  default: z.boolean().optional(),
  env: z.record(z.string(), z.string()).optional(),
  roles: z
    .object({
      claim: z.string().optional(),
      byEmail: z.record(z.string(), z.array(z.string())).optional(),
      allowedDomains: z.array(z.string()).optional(),
    })
    .optional(),
  guards: z.record(z.string(), RoleGuardSchema).optional(),
  defaultSecurity: z
    .union([
      z.object({ public: z.literal(true) }),
      z.object({ guard: z.union([z.string(), z.array(z.string()).min(1)]) }),
    ])
    .optional(),
});

export type AuthProviderConfig = z.infer<typeof AuthProviderSchema>;
export type RoleGuard = z.infer<typeof RoleGuardSchema>;
