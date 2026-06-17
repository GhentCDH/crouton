# CLI & project config

The `crouton` CLI keeps your `resource.json` files in sync with your database. It introspects a datasource's Prisma schema, then generates new resources and reconciles existing ones — interactively, so you stay in control of every change.

```sh
pnpm add -D @ghentcdh/crouton-cli
npx crouton update resources
```

## crouton.json

A `crouton.json` file at the project root tells the CLI where things live. It holds **only project-wide paths and settings** — datasources are described in their own folders (see [Data sources](./datasource.md)), not here.

```json
{
  "resourcesDir": "apps/backend/src/app/resources",
  "dataSourcesDir": "apps/backend/src/app/data-sources",
  "schemaExportName": "{Model}WithRelationsSchema",
  "enumsFile": "crouton.enums.json"
}
```

| Field | Description |
| --- | --- |
| `resourcesDir` | Where resource directories live, relative to the project root. |
| `dataSourcesDir` | Where datasource folders live. The CLI scans this to discover datasources. |
| `schemaExportName` | Optional. Template for a model's Zod export name; `{Model}` → Prisma model name. Default `{Model}WithRelationsSchema`. |
| `enumsFile` | Optional. Path to the shared [enum registry](#enum-registry). Default `crouton.enums.json`. |

If no `crouton.json` is found, the CLI proposes one (and a `data-source.json` per detected datasource) and offers to write it.

## crouton create-datasource

Scaffold a new [datasource](./datasource.md) — interactively, or fully via flags:

```sh
npx crouton create-datasource
# or scripted:
npx crouton create-datasource \
  --name analyticsdb \
  --url-env ANALYTICS_DATABASE_URL \
  --generated-import @my-app/generated/analyticsdb
```

It reads `crouton.json` for `dataSourcesDir`, checks the name isn't already taken, and writes four files (never overwriting existing ones):

| File | Purpose |
| --- | --- |
| `<dataSourcesDir>/<name>/data-source.json` | Self-describing datasource config. |
| `<dataSourcesDir>/<name>/index.ts` | Runtime `PrismaClient`, connecting via the chosen env var. |
| `prisma/<name>/schema.prisma` | Per-datasource schema with **unique** client and zod outputs, so multiple datasources never collide. |
| `prisma/<name>/prisma.config.ts` | Binds this datasource's `urlEnv` (Prisma 7 reads the URL here, not from the schema). |

The first datasource in a project becomes the default; later ones are non-default unless you pass `--default` (and only one datasource may be default). Useful flags: `--type` (postgres/mysql/sqlite/…), `--zod-output`, `--prisma-schema`, `--prisma-config`, `--client-output`, `--cwd`, `--dry-run`, `-y/--yes`.

After scaffolding: add the `urlEnv` to your `.env`, map the `generatedTypesImport` to the zod output in your tsconfig paths / workspace, then run `crouton update resources --datasource <name>`.

## crouton update resources

The command walks through:

1. **Pick a datasource** — discovered by scanning `dataSourcesDir`. Skipped when there's a single or `default` datasource, or pass `--datasource <name>`.
2. **`prisma db pull` + `generate`** — refreshes the datasource's schema and generated Zod types using its `prismaConfig`. The current schema is backed up first; the CLI warns if it has uncommitted changes.
3. **Pick models** — choose which Prisma models to generate or update (existing ones are marked).
4. **Resolve changes** — for each new column or change, choose per resource how to apply it: keep existing, overwrite, merge, or decide per field. New resources can be added to the sidebar.
5. **Preview & confirm** — only changed files are listed; nothing is written until you confirm.

Useful flags:

| Flag | Effect |
| --- | --- |
| `--datasource <name>` | Use a specific datasource. |
| `--models <a,b>` | Limit to specific models (Prisma or resource names). |
| `--dry-run` | Show the plan without writing. |
| `--yes` | Non-interactive; accept recommended choices. |
| `--skip-pull` / `--skip-generate` | Skip the Prisma steps. |

### What gets generated

For each model, the CLI writes a `resource.json` (columns as a map, sensible defaults applied) and, when absent, a sibling `schema.ts` that re-exports the generated Zod schema from the datasource's `generatedTypesImport`. A hand-written `schema.ts` is never overwritten.

Defaults applied during generation:

- relations are **ignored** (not added as columns) unless explicitly enabled;
- `id`, and create/update timestamps are hidden in the table;
- `description`-style string fields default to a `textarea` input;
- enum columns become `{ value, label }` selects backed by the shared registry.

## Enum registry

Enum option lists live once in a project-level `crouton.enums.json` so every resource references the same labels instead of duplicating them:

```json
{
  "author_origin_enum": [
    { "value": "wikidata", "label": "Wikidata" },
    { "value": "syriaca", "label": "Syriaca", "disabled": true }
  ],
  "text_type_enum": [
    { "value": "original", "label": "Original" },
    { "value": "translation", "label": "Translation" }
  ]
}
```

A column references a list by name:

```json
{
  "text_type": {
    "enum": "text_type_enum",
    "displayKey": "label",
    "fieldInput": { "options": { "emitObject": true } }
  }
}
```

At load time the referenced list is injected into the column's options, so the table shows the label while forms submit the scalar value. `crouton update resources` merges newly discovered enum values into the registry, preserving labels and order you've edited by hand and never dropping existing entries.

The registry is loaded by walking up from the resources directory, or via the `enumsFile` option to `forResourceDir` (see [Backend setup](./backend.md)). In production, deploy `crouton.enums.json` somewhere that walk-up can reach, or pass `enumsFile` explicitly.

## Keeping the CLI fresh

When you consume crouton via `file:` links, package managers install a **copy** of the built CLI, not a live link to `dist`. After rebuilding crouton, re-run your install (e.g. `pnpm install` / `pnpm install --force`) so the binary you run is the rebuilt one.
