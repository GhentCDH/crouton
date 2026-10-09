# Task: Add a custom external-api data source

## Setup

You are working in a crouton project. The `src/data-sources/` directory exists and already has a `default` (Prisma) data source. You need to add a second data source that talks to an external REST API.

## Your task

1. Create `src/data-sources/external-api/datasource.json`:
   ```json
   {
     "name": "external-api",
     "adapter": "./adapter"
   }
   ```

2. Create `src/data-sources/external-api/adapter.ts` with a minimal stub adapter:
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
Expected: exits 0 with no issues (validate ignores datasource files currently, but the files must exist with valid JSON).

## Hints

- Use the crouton skill if available
- Read `node_modules/@ghentcdh/crouton-core/agent-docs/README.md` for docs
- The `name` in `datasource.json` must match the directory name
- The `adapter` path is relative to the datasource directory
