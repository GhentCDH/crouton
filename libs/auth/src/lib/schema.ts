import { z } from 'zod';

const RoleGuardSchema = z
  .union([
    z.array(z.string()).min(1),
    z.object({ anyOf: z.array(z.string()).min(1), allOf: z.array(z.string()).min(1).optional() }),
    z.object({ allOf: z.array(z.string()).min(1), anyOf: z.array(z.string()).min(1).optional() }),
  ])
  .describe(
    'A guard definition: an array of role names (anyOf shorthand), or an object combining anyOf/allOf role lists.',
  );

export const AuthProviderSchema = z.object({
  $schema: z
    .string()
    .optional()
    .describe('URL of the JSON Schema for editor autocomplete and validation. Ignored at runtime.'),
  name: z.string().describe('Human-readable provider name, returned by GET /_app/auth.'),
  provider: z
    .enum(['keycloak', 'auth0', 'google', 'microsoft', 'oidc', 'dev', 'custom'])
    .describe('Built-in provider preset, or "custom" for an index.ts adapter.'),
  default: z
    .boolean()
    .optional()
    .describe('Marks this provider as the default when several are configured.'),
  env: z
    .record(z.string(), z.string())
    .optional()
    .describe('Overrides the default env var names, keyed by preset field, e.g. { "url": "MY_KEYCLOAK_URL" }.'),
  roles: z
    .object({
      claim: z
        .string()
        .optional()
        .describe('Dot-path to the roles claim (overrides the provider preset default).'),
      byEmail: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Maps a role name to the list of emails that receive it (used by the google provider).'),
      allowedDomains: z
        .array(z.string())
        .optional()
        .describe('Reserved for restricting sign-in to these email domains (not currently enforced).'),
    })
    .optional()
    .describe('Role extraction settings.'),
  guards: z
    .record(z.string(), RoleGuardSchema)
    .optional()
    .describe('Named guards usable from a resource.json "security.guard" entry.'),
  defaultSecurity: z
    .union([
      z.object({ public: z.literal(true) }),
      z.object({ guard: z.union([z.string(), z.array(z.string()).min(1)]) }),
    ])
    .optional()
    .describe('Module-level default security applied when neither an operation nor a resource declares any.'),
});

export type AuthProviderConfig = z.infer<typeof AuthProviderSchema>;
export type RoleGuard = z.infer<typeof RoleGuardSchema>;
