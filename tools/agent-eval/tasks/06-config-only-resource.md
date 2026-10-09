# Task: Create a config-only custom resource

## Setup

You are working in a crouton project. The `src/resources/` directory exists but has no `app-settings` resource yet. There is no Prisma model for `AppSettings` — this is a fully custom resource managed by your own code.

## Your task

1. Create `src/resources/app-settings/resource.json` with:
   - Correct `$schema` and `schemaVersion`
   - `name: "app-settings"`
   - `kind: "custom"`
   - A `title` field of your choice
   - At least one column (e.g. `key` and `value` as string fields)

2. Create `src/resources/app-settings/repository.ts` with a minimal stub that exports a default object satisfying the crouton repository interface:
   ```ts
   export default {
     findAll: async () => ({ data: [], total: 0 }),
     findOne: async (_id: string | number) => null,
     create: async (data: unknown) => data,
     update: async (_id: string | number, data: unknown) => data,
     delete: async (_id: string | number) => void 0,
   };
   ```

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- Use the crouton skill if available
- Read `node_modules/@ghentcdh/crouton-core/agent-docs/README.md` for docs
- `kind: "custom"` means crouton will not generate a Prisma-backed repository — you supply your own
- The `repository.ts` stub just needs to exist; it does not need to be functional
