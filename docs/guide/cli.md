# CLI & project config

::: warning Beta — first release
`create-crouton` and `add-crouton` are newly added scaffolding tools. They are functional but have not been battle-tested across a wide range of projects yet. Expect rough edges: generated file paths may need manual tweaking, and `@ghentcdh/*` packages must be published to npm before a scaffolded project can `install`. Feedback and bug reports are welcome.
:::

The crouton toolchain ships three CLI packages:

| Command | Package | Purpose |
| --- | --- | --- |
| `npx create-crouton` | `create-crouton` | Scaffold a brand-new crouton project from scratch |
| `npx add-crouton` | `add-crouton` | Add crouton to an existing NestJS or Nx project |
| `npx crouton …` | `@ghentcdh/crouton-cli` | Day-to-day project commands: update resources, create datasources |

---

## create-crouton

Scaffolds a complete new project — directory structure, NestJS backend, optional Vue frontend, Prisma wiring, Docker files, and a ready-to-run `crouton.json`.

```sh
npx create-crouton                 # fully interactive
npx create-crouton my-app          # name as argument
npx create-crouton my-app --yes    # accept all defaults (CI)
```

### Prompt flow

The wizard asks:

1. **Project name** — npm-safe slug, used as the directory name and image name.
2. **Layout** — regular (single package) or Nx monorepo.
3. **Nx app names** — backend and frontend app names (Nx only; defaults `backend` / `frontend`).
4. **Frontend** — include Vue + crouton-vue? (default yes).
5. **Package manager** — detected from your environment; choose pnpm / npm / yarn / bun.
6. **Sample model** — add a `Note` model so the app has something to run immediately.
7. **Install dependencies** — run `<pm> install` right away.
8. **Configure datasource** — launch the `crouton create-datasource` wizard inside the new project.
9. **Docker files** — generate `Dockerfile.dev`, `Dockerfile.prod`, and `compose.yml`.

Every prompt has a flag equivalent; see `npx create-crouton --help`.

### Regular layout

```
my-app/
  package.json           crouton.json          crouton.enums.json
  prisma/schema.prisma   prisma.config.ts       .env  .env.example
  src/
    main.ts              app.module.ts
    data-sources/default/{data-source.json,index.ts}
    resources/
  frontend/              (if included)
  docker/
    Dockerfile.dev       Dockerfile.prod        compose.yml
```

### Nx monorepo layout

```
my-app/
  nx.json   pnpm-workspace.yaml   tsconfig.base.json
  crouton.json   crouton.enums.json   prisma/   prisma.config.ts   .env
  apps/
    backend/
      src/app/{app.module.ts,resources/,data-sources/}
    frontend/              (if included)
  generated/
    backend/               zod-prisma-types output (workspace package)
  docker/
    Dockerfile.dev         Dockerfile.prod        compose.yml
```

### After scaffolding

```sh
# Start a local Postgres (or configure DATABASE_URL to point at your own)
docker compose -f docker/compose.yml up -d db

# Run the first migration
pnpm prisma migrate dev --name init

# Generate resource configs from the schema
pnpm crouton update resources

# Start the dev server
pnpm dev
```

### Flags

| Flag | Description |
| --- | --- |
| `--nx` / `--no-nx` | Force Nx or regular layout. |
| `--backend-app-name <n>` | Backend app name in the Nx layout (default `backend`). |
| `--frontend-app-name <n>` | Frontend app name in the Nx layout (default `frontend`). |
| `--no-frontend` | Omit the frontend entirely. |
| `--sample` | Include a `Note` model + pre-generated resource. |
| `--pm <pm>` | Package manager: `pnpm`, `npm`, `yarn`, or `bun`. |
| `--no-install` | Skip `<pm> install`. |
| `--no-git` | Skip `git init`. |
| `--no-docker` | Skip Docker file generation. |
| `-y, --yes` | Accept all defaults (CI/non-interactive). |
| `--force` | Write into a non-empty directory. |
| `--cwd <dir>` | Parent directory for the new project. |

---

## add-crouton

Adds crouton to an **existing** project. Works with both regular Node projects and Nx monorepos. Only writes files that are absent — never silently overwrites.

```sh
npx add-crouton          # interactive, run from your project root
npx add-crouton --yes    # accept all defaults
```

### Prompt flow

1. **Detect project type** — checks for `nx.json` automatically; reports what it found.
2. **Backend app** _(Nx)_ — select from discovered `apps/` directories (classified by deps: `@nestjs/core` → backend) or create a new one.
3. **Frontend app** _(Nx)_ — select, skip, or create a new `apps/` entry.
4. **Missing dependencies** — scans your `package.json` and reports absent `@ghentcdh/*` deps; offers to add them.
5. **Install dependencies** — run `<pm> install`.
6. **Configure datasource** — run `crouton create-datasource` in your project.
7. **Docker files** — generate `Dockerfile.dev`, `Dockerfile.prod`, `compose.yml`.

### What gets written

`add-crouton` is strictly additive. It creates:

- `crouton.json` (if absent) — paths pointing at the detected backend resources dir
- `crouton.enums.json` (if absent) — empty registry
- `data-sources/default/{data-source.json,index.ts}` (if absent)
- `resources/.gitkeep` (if absent)
- Docker files in `docker/`

It also prints an instruction for wiring `CroutonApiModule.forResourceDir(…)` into your NestJS app module — it does not modify your existing module file automatically.

### Flags

| Flag | Description |
| --- | --- |
| `--cwd <dir>` | Project root (default: current directory). |
| `--backend <path>` | _(Nx)_ Relative path to backend app, skips detection. |
| `--frontend <path>` | _(Nx)_ Relative path to frontend app, or `"none"`. |
| `--no-frontend` | Skip frontend wiring. |
| `--pm <pm>` | Package manager. |
| `--no-install` | Skip `<pm> install`. |
| `--no-docker` | Skip Docker file generation. |
| `-y, --yes` | Accept all defaults. |

---

## Docker files

Both scaffolders generate the same three files under `docker/`:

### `Dockerfile.dev` — live-watch

Installs all dependencies, runs `prisma generate`, then starts the dev server(s). The source tree is **bind-mounted** from the host via `compose.yml` so edits on your machine trigger HMR / ts-node-dev / Vite HMR without rebuilding the image.

```sh
docker compose -f docker/compose.yml up        # starts db + app
```

### `Dockerfile.prod` — multi-stage, single container

| Stage | What happens |
| --- | --- |
| **builder** | Full install, `prisma generate`, compile backend + frontend. |
| **runtime** | Production deps only, compiled backend, Vue SPA copied to `public/`, runtime JSON assets (`crouton.enums.json`, `data-sources/`, `resources/`). |

The backend serves the Vue SPA via `@nestjs/serve-static` on port 3000. No reverse proxy or separate container needed for a standard deployment.

```sh
docker build -f docker/Dockerfile.prod -t my-app .
docker run -p 3000:3000 --env-file .env my-app
```

### `compose.yml` — dev compose

Starts a `db` (postgres:16) with a healthcheck and an `app` service using `Dockerfile.dev`. Backend and (if present) frontend ports are forwarded; the source tree is mounted for live editing.

---

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

---

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
| `prisma/<name>/schema.prisma` | Per-datasource schema with **unique** client and zod outputs. |
| `prisma/<name>/prisma.config.ts` | Binds this datasource's `urlEnv` (Prisma 7 reads the URL here, not from the schema). |

The first datasource in a project becomes the default; later ones are non-default unless you pass `--default`. Useful flags: `--type`, `--zod-output`, `--prisma-schema`, `--prisma-config`, `--client-output`, `--cwd`, `--dry-run`, `-y/--yes`.

After scaffolding: add the `urlEnv` to your `.env`, map the `generatedTypesImport` to the zod output in your tsconfig paths / workspace, then run `crouton update resources --datasource <name>`.

---

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

---

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

---

## Keeping the CLI fresh

When you consume crouton via `file:` links, package managers install a **copy** of the built CLI, not a live link to `dist`. After rebuilding crouton, re-run your install (e.g. `pnpm install` / `pnpm install --force`) so the binary you run is the rebuilt one.
