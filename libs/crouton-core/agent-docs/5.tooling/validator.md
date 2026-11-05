# Validate resource.json

Paste your `resource.json` below to validate it against the exact same Zod schema the crouton API uses at runtime — `buildResourceJsonSchema()` from `crouton-core`.

> **Note:** This page validates the _core shape_ only (Layer 1 of the loader pipeline). It does not run the compile step (`parseSchema` / `compileResource`) — that requires a sibling `schema.ts` and is server-side only. Extensions registered by your app are also not active here, so extension-specific keys will not be validated but will not cause errors either.
>
> The published JSON Schema at `/schema/v1/resource.schema.json` is more permissive than this runtime check — it is generated without the `refineByKind` refinement. Use this page for the strictest, API-parity check.

<ResourceJsonValidator />

## What is validated

- JSON is well-formed
- Migrations run (`runResourceMigrations`) to bring older formats up to the current version
- `buildResourceJsonSchema().safeParse()` — the same call made by the API loader

## What is not validated

- Compile-time correctness (column types matching the Prisma schema) — needs `schema.ts`
- Structural filesystem checks (`validateResourceConfig`) — server-side only
- App-specific extensions — not registered in the docs build
