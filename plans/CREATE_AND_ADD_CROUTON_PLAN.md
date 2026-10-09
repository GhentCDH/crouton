Status: planned
# `create-crouton` & `add-crouton` — Implementation Plan

Two CLI tools covering the full crouton onboarding lifecycle:

- **`npx create-crouton [name]`** — scaffolds a brand-new project from scratch
- **`npx add-crouton`** — adds crouton to an existing project (NX or regular)

Both share the same prompt engine, template renderer, datasource wiring, and Docker generation.
They differ only in their starting context: one writes a new directory, the other operates on an
existing repo in-place.

---

## 0. Package layout

> **Existing state:** `packages/create-crouton-app` exists with a minimal commander setup,
> single-bundle tsup config (outDir `../../dist/create-crouton-app`), and `commander@^14` devDep.
> It will be replaced by `packages/create-crouton`.

```
packages/
  create-crouton/          # new (replaces create-crouton-app)
    package.json           # bin: { "create-crouton": "../../dist/create-crouton/index.js" }
    src/
      index.ts             # commander entrypoint
      prompts.ts           # @clack/prompts wrappers
      runner.ts            # orchestrates the flow
      scaffold/            # file writers
      templates/           # embedded template tree (copied into dist by tsup)
    tsup.config.ts

  add-crouton/             # new
    package.json           # bin: { "add-crouton": "../../dist/add-crouton/index.js" }
    src/
      index.ts
      prompts.ts
      runner.ts
      scaffold/
    tsup.config.ts
```

Both packages bundle their own prompts (no shared prompts in crouton-codegen — that package stays
pure/prompt-free). Shared _logic_ (template rendering, dep scanning) lives in a `lib/` dir inside
one package and is imported by the other via workspace reference.

Template files live in `packages/create-crouton/templates/` and `packages/add-crouton/templates/`
and are bundled into `dist/<pkg>/templates/` via tsup `publicDir` or a custom `onSuccess` copy
step (same pattern as the existing CLI dist). Both packages use the same tsup `noExternal` +
`createRequire` banner approach.

---

## 1. Shared prompt flow (both CLIs follow the same order)

```
1.  [create only] Project name
2.  Is this an Nx monorepo?
3.  [Nx = yes]  Select / create backend project
4.  [Nx = yes]  Select / create frontend project (or skip)
5.  [Nx = no ]  All-in-one: backend + optional frontend in the same package
6.  Package manager (detect from npm_config_user_agent, default pnpm)
7.  Install missing dependencies now?
8.  Configure a datasource?  → if yes: run crouton create-datasource flow
9.  Generate Docker files?   → Dockerfile.dev + Dockerfile.prod + compose.yml
```

Every prompt has a flag equivalent. `--yes` accepts defaults (CI mode).

---

## 2. `npx create-crouton`

### 2a. Flags

```
create-crouton [name]
  --nx                    force NX layout
  --no-nx                 force regular layout
  --no-frontend           skip frontend scaffolding
  --sample                include a Note model + resource
  --pm <npm|pnpm|yarn|bun>
  --no-install            skip dep install
  --no-git                skip git init
  --no-docker             skip Docker file generation
  --yes                   accept all defaults
  --force                 allow writing into a non-empty directory
```

### 2b. Prompt sequence

```
◆  Project name (slug, npm-safe)
   └─ validate: /^[a-z0-9][a-z0-9._-]*$/, target dir empty or --force

◆  Layout
   ○ Regular — single package, backend + optional frontend
   ○ Nx monorepo — apps/backend + apps/frontend + libs

   [if Nx]
   ◆  Frontend app name  (default: frontend)
   ◆  Backend app name   (default: backend)

◆  Include a frontend (Vue + crouton-vue)?  [Y/n]

◆  Package manager  [pnpm ▶ npm ▶ yarn ▶ bun]

◆  Add a sample Note model so the app runs immediately?  [Y/n]

◆  Install dependencies now?  [Y/n]

◆  Configure a datasource?  [Y/n]
   └─ if yes → inline crouton create-datasource interactive flow
      (name, type, urlEnv, generatedTypesImport — see §5)

◆  Generate Docker files?  [Y/n]
```

### 2c. Scaffolded output — Regular layout

```
<name>/
  package.json              # scripts: dev, build, start, prisma:migrate, crouton
  tsconfig.json
  .env                      # DATABASE_URL=postgresql://...
  .env.example
  .gitignore
  .nvmrc
  README.md
  crouton.json              # resourcesDir, dataSourcesDir, schemaExportName, enumsFile
  crouton.enums.json        # {}
  prisma/
    schema.prisma           # generator client + zod-prisma-types (no `url` in datasource — Prisma 7)
  prisma.config.ts          # defineConfig({ datasource: { url: env("DATABASE_URL") } })
  src/
    main.ts                 # NestJS bootstrap
    app.module.ts           # CroutonApiModule.forResourceDir(resources, data-sources, {enumsFile})
    data-sources/
      default/
        data-source.json    # { type, name:"default", default:true, ... }
        index.ts            # PrismaClient + PrismaPg adapter
    resources/              # empty, or note/ if --sample
  [frontend/]               # Vite + Vue + crouton-vue (if included)
  docker/
    Dockerfile.dev
    Dockerfile.prod
    compose.yml
    .dockerignore
```

### 2d. Scaffolded output — Nx layout

```
<name>/
  nx.json
  pnpm-workspace.yaml       # apps/* libs/* generated/*
  package.json              # root: nx devDep, workspace scripts
  tsconfig.base.json
  crouton.json              # resourcesDir: apps/backend/src/app/resources, etc.
  crouton.enums.json
  prisma/
    schema.prisma
  prisma.config.ts
  .env  .env.example  .gitignore  .nvmrc  README.md
  apps/
    backend/
      project.json
      package.json
      tsconfig.json
      src/
        main.ts
        app/
          app.module.ts
          data-sources/default/{data-source.json,index.ts}
          resources/
    frontend/               # if included
      project.json
      package.json
      tsconfig.json
      vite.config.ts
      src/
        main.ts
        App.vue
        api.ts              # useCrouton().init(...)
  generated/
    types/                  # zod-prisma-types output (workspace package @<name>/generated-types)
      package.json
      src/
  libs/                     # empty placeholder
  docker/
    Dockerfile.dev
    Dockerfile.prod
    compose.yml
    .dockerignore
```

---

## 3. `npx add-crouton`

Operates on an **existing** project. Detects context rather than asking from scratch.

### 3a. Flags

```
add-crouton
  --cwd <path>             target directory (default: process.cwd())
  --backend <path>         [Nx] relative path to backend app (skips detection)
  --frontend <path>        [Nx] relative path to frontend app (or "none")
  --no-frontend            skip frontend wiring
  --pm <npm|pnpm|yarn|bun>
  --no-install             skip dep install
  --no-docker              skip Docker file generation
  --yes                    accept all defaults
```

### 3b. Prompt sequence

```
◆  Detect project type
   └─ checks for nx.json → "Nx monorepo detected"
   └─ checks for package.json → "Regular Node project detected"

[if Nx]
◆  Which app is your backend?
   └─ lists apps/ subdirs that have a NestJS dependency (package.json scan)
   └─ option: [create new backend app]

◆  Which app is your frontend? (or none)
   └─ lists apps/ subdirs with a Vue / Vite dependency
   └─ option: [create new frontend app] | [none — skip frontend]

[if regular]
◆  Does this package contain backend code, frontend code, or both?
   ○ Backend + frontend (monolith)
   ○ Backend only
   ○ Frontend only

◆  Package manager  [detected from lockfile ▶ prompt]

◆  Missing dependencies to add:
   └─ scans existing package.json(s) and reports which @ghentcdh/* are absent
   └─ lists them for confirmation before adding

◆  Install dependencies now?  [Y/n]

◆  Configure a datasource?  [Y/n]
   └─ if crouton.json already exists: skip scaffold, go straight to create-datasource
   └─ if absent: write crouton.json first, then create-datasource flow

◆  Generate Docker files?  [Y/n]
   └─ warns if docker/ or Dockerfile.* already exist → confirm overwrite
```

### 3c. What `add-crouton` writes

Additive only — never overwrites existing files without confirmation.

**Backend target:**
- `crouton.json` (if absent)
- `crouton.enums.json` (if absent)
- `data-sources/default/{data-source.json,index.ts}` (if absent)
- Injects `CroutonApiModule.forResourceDir(...)` into detected app module (or prints instructions)
- Adds missing `@ghentcdh/crouton-api`, `@ghentcdh/crouton-cli`, `@prisma/adapter-pg` to `package.json`

**Frontend target (if selected):**
- Adds `@ghentcdh/crouton-vue`, `@ghentcdh/json-forms-vue` to frontend `package.json`
- Writes `src/api.ts` stub (if absent)
- Prints instructions for `useCrouton().init(useApi(), {...})` in `App.vue`

**Root / shared:**
- Docker files (§6)
- `.env.example` entries for `DATABASE_URL` (appended if file exists)

---

## 4. Nx project detection & selection detail

```typescript
// Detection
const isNx = existsSync(path.join(cwd, 'nx.json'));

// App discovery (Nx)
function discoverNxApps(cwd: string): NxApp[] {
  // read nx.json projects or scan apps/ subdirs
  // for each: read package.json deps → classify as backend/frontend/unknown
  // backend = has @nestjs/core
  // frontend = has vue or vite
}

// Prompts (Nx)
const backendApp = await select({
  message: 'Which app is your backend?',
  options: [
    ...apps.filter(isBackend).map(a => ({ value: a.path, label: a.name })),
    { value: '__new__', label: '+ Create new backend app' },
  ],
});

const frontendApp = await select({
  message: 'Which app is your frontend?',
  options: [
    { value: '__none__', label: 'None — skip frontend' },
    ...apps.filter(isFrontend).map(a => ({ value: a.path, label: a.name })),
    { value: '__new__', label: '+ Create new frontend app' },
  ],
});
```

When `__new__` is selected, scaffold a minimal NestJS app (backend) or Vite+Vue app (frontend)
into `apps/<name>/` using the same template fragments used by `create-crouton`.

---

## 5. Datasource configuration (shared flow)

When the user answers yes to "Configure a datasource?", run the existing
`crouton create-datasource` interactive flow **inline** (import the runner directly, not via
`child_process`) so it feels like one uninterrupted wizard.

> **Note:** `@ghentcdh/crouton-cli` currently has **no subpath exports** — it bundles everything
> into a single `dist/index.js`. Two options:
>
> **Option A (preferred):** Extract `runCreateDatasource` into `@ghentcdh/crouton-codegen` (it
> already has the `buildDatasourceFiles` logic; add the interactive wrapper). Both CLIs + crouton-cli
> import from codegen. This keeps codegen prompt-free by making the extracted function accept a
> "prompt adapter" callback.
>
> **Option B:** Add a `create-datasource` subpath export to crouton-cli:
> add `"exports": { ".": "./dist/index.js", "./create-datasource": "./dist/create-datasource.js" }`
> to package.json and configure tsup with a second entry point.

```typescript
// Option A: import from codegen (prompt-free runner + prompt adapter)
import { runCreateDatasource } from '@ghentcdh/crouton-codegen';

await runCreateDatasource({
  cwd: targetDir,
  yes: opts.yes,
  dataSourcesDir: config.dataSourcesDir,
  prompt: clackPromptAdapter, // inject CLI-specific prompts
});
```

This prompts for: datasource name, type (postgres/mysql/sqlite/…), URL env var name,
`generatedTypesImport` package, zod output dir. It writes `data-sources/<name>/data-source.json`
and the companion `index.ts` + `prisma/<name>/schema.prisma` + `prisma/<name>/prisma.config.ts`.

After the datasource is created, offer to run `crouton update resources` immediately (best-effort,
only if `@prisma/internals` is installed).

---

## 6. Docker files

### 6a. `Dockerfile.dev` — live-watch, backend + optional frontend

```dockerfile
# Dockerfile.dev
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
# [Nx] COPY pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate   # (or nx run backend:prisma-generate for Nx)

# Backend hot-reload on :3000, frontend dev server on :4200
CMD ["pnpm", "dev"]        # or: ["pnpm", "nx", "run-many", "--target=serve"]
```

Bind-mount the entire source tree so edits on the host trigger HMR / ts-node-dev / vite HMR
without rebuilding the image.

### 6b. `Dockerfile.prod` — multi-stage, single image serving backend + frontend

```dockerfile
# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
# [Nx] COPY pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm prisma generate
RUN pnpm build             # compiles backend (tsc/nest build) + frontend (vite build)
# [Nx] RUN pnpm nx run-many --target=build --all

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN corepack enable pnpm
WORKDIR /app

# Production deps only
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# Backend compiled output
COPY --from=builder /app/dist ./dist

# [Nx] COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Static frontend assets served by the backend (NestJS ServeStaticModule)
COPY --from=builder /app/frontend/dist ./public
# [Nx] COPY --from=builder /app/apps/frontend/dist ./public

# Runtime JSON assets that crouton-api loader reads at runtime
COPY --from=builder /app/crouton.enums.json ./crouton.enums.json
COPY --from=builder /app/data-sources ./data-sources
COPY --from=builder /app/resources ./resources  # or apps/backend/src/app/resources for Nx

# Prisma engine + schema
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
# [Nx] CMD ["node", "apps/backend/dist/main.js"]
```

**Frontend static serving:** the backend includes `@nestjs/serve-static` pointed at `./public`.
One port, one container, no reverse proxy needed for simple deployments.

### 6c. `compose.yml` (dev)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: crouton
      POSTGRES_PASSWORD: crouton
      POSTGRES_DB: {{name}}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crouton"]
      interval: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: docker/Dockerfile.dev
    env_file: .env
    environment:
      DATABASE_URL: postgresql://crouton:crouton@db:5432/{{name}}?schema=public
    ports:
      - "3000:3000"   # backend
      - "4200:4200"   # frontend dev server (if included)
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules   # anonymous volume so host node_modules doesn't clobber

volumes:
  postgres_data:
```

### 6d. `.dockerignore`

```
node_modules
dist
.git
.env
*.log
```

---

## 7. Missing dependency resolution

Both CLIs scan target `package.json`(s) and compute a diff against the required set:

```typescript
const BACKEND_DEPS = {
  deps: ['@ghentcdh/crouton-api', '@ghentcdh/crouton-core', '@prisma/adapter-pg'],
  devDeps: ['@ghentcdh/crouton-cli', 'prisma', 'zod-prisma-types'],
};
const FRONTEND_DEPS = {
  deps: ['@ghentcdh/crouton-vue', '@ghentcdh/json-forms-vue', 'vue'],
  devDeps: ['vite', '@vitejs/plugin-vue'],
};

// Report missing ones:
const missing = computeMissing(existing, required);
if (missing.length) {
  log.warn(`Missing dependencies:\n${missing.map(d => `  ${d}`).join('\n')}`);
  const add = await confirm({ message: 'Add them to package.json?' });
  if (add) writeDepsToPackageJson(targetPackageJson, missing);
}
```

Versions are pinned to the CLI's own `package.json` (peer version map bundled in dist), so
the generated `package.json` always installs compatible versions.

---

## 8. Post-scaffold steps (both CLIs)

```
1. Write files (skip existing without --force; prompt on conflict in add-crouton)
2. git init + initial commit  (create-crouton only, unless --no-git)
3. Install deps with chosen PM  (unless --no-install)
4. prisma generate  (best-effort, warn on failure)
5. Print next steps:
     docker compose -f docker/compose.yml up -d db
     pnpm prisma migrate dev --name init
     crouton update resources
     pnpm dev
```

---

## 9. Templating strategy

- Templates are plain `.ts` / `.json` / `.prisma` / `Dockerfile` / `.yml` files stored under
  `templates/regular/` and `templates/nx/` with `{{token}}` placeholders.
- Token replacement via a single `render(template, tokens)` util using `replaceAll` — no external
  engine needed.
- Common tokens: `{{name}}`, `{{Name}}` (PascalCase), `{{pmRun}}`, `{{year}}`, `{{backendPort}}`,
  `{{frontendPort}}`, `{{dbName}}`, `{{urlEnv}}`.
- Templates are read at runtime via `import.meta.url`-relative paths and bundled into
  `dist/<pkg>/templates/` by tsup's `publicDir` option.
- NX-specific lines inside shared templates are gated by `{{#if nx}}…{{/if}}` — a tiny 5-line
  conditional renderer; no Handlebars dependency.

---

## 10. Implementation phases

All work on branch `refactor/json-to-schema`. Each phase ends with a conventional commit.

### Phase 1 — Scaffold `packages/create-crouton`

Replace `create-crouton-app`. Wire package.json (bin, deps), tsup.config.ts, commander entrypoint.
No templates yet — just the skeleton that builds and runs `--help`.

```
git commit -m "feat(create-crouton): scaffold package, replace create-crouton-app"
```

### Phase 2 — Scaffold `packages/add-crouton`

New package, same tsup pattern. Commander entrypoint with flags from §3a. Builds, runs `--help`.

```
git commit -m "feat(add-crouton): scaffold package with commander entrypoint"
```

### Phase 3 — Shared utilities

Build shared `lib/` in create-crouton (imported by add-crouton via workspace ref):
- `render.ts` — template token replacement + `{{#if}}` conditionals
- `deps.ts` — `computeMissing` + `writeDepsToPackageJson`
- `detect.ts` — package manager detection, Nx detection
- `prompt-adapter.ts` — interface for injectable prompts (keeps codegen prompt-free)

```
git commit -m "feat(create-crouton): add shared template renderer, dep scanner, prompt adapter"
```

### Phase 4 — Regular-layout templates

`.env`, prisma/schema.prisma, prisma.config.ts, crouton.json, src/main.ts, app.module.ts,
data-sources/default/, crouton.enums.json. Wire into create-crouton runner.

```
git commit -m "feat(create-crouton): implement regular-layout template tree"
```

### Phase 5 — Nx-layout templates

nx.json, pnpm-workspace.yaml, tsconfig.base.json, apps/backend/, apps/frontend/,
generated/types/. Wire into create-crouton runner with layout switch.

```
git commit -m "feat(create-crouton): implement Nx-layout template tree"
```

### Phase 6 — Docker templates

Dockerfile.dev, Dockerfile.prod, compose.yml, .dockerignore. Conditional Nx vs regular lines.
Wire into both CLIs.

```
git commit -m "feat: add Docker template generation (dev + prod + compose)"
```

### Phase 7 — Nx app detection & selection

`discoverNxApps()`: scan apps/ subdirs, classify via package.json deps (@nestjs/core → backend,
vue/vite → frontend). Wire into add-crouton prompts.

```
git commit -m "feat(add-crouton): implement Nx app detection and selection"
```

### Phase 8 — Missing dependency scanner

`computeMissing()` against BACKEND_DEPS / FRONTEND_DEPS. Version pinning from bundled peer map.
Wire into both CLIs.

```
git commit -m "feat: implement missing dependency scanner for both CLIs"
```

### Phase 9 — Datasource flow integration

Extract or import `runCreateDatasource` (see §5 for options). Wire inline into both CLIs'
"Configure a datasource?" step.

```
git commit -m "feat: wire create-datasource flow inline into both CLIs"
```

### Phase 10 — Post-scaffold steps

git init (create-crouton only), dep install, prisma generate (best-effort), next-steps output.

```
git commit -m "feat: add post-scaffold steps (git init, install, prisma generate, next-steps)"
```

### Phase 11 — Smoke test

Manual: scaffold both layouts, `pnpm install`, boot, `crouton update resources`. Fix issues found.

```
git commit -m "fix: address smoke test findings"
```

### Phase 12 — Packaging & release config

Update root nx.json release config to include new packages. Verify workspace build.
Remove old `create-crouton-app` package.

```
git commit -m "chore: add create-crouton and add-crouton to release config, remove create-crouton-app"
```

---

## 11. Key gotchas (carry-forward from existing knowledge + verification)

- **Prisma 7**: no `url` in `datasource` block in `schema.prisma`; connection comes from
  `prisma.config.ts`. Generated templates must follow this or `crouton update resources` fails.
- **Runtime JSON assets**: `resource.json`, `crouton.enums.json`, `data-source.json` must land
  next to the compiled app in the prod image. The `Dockerfile.prod` `COPY` steps are non-optional.
- **esbuild condition**: any package that `noExternal`-bundles a `@ghentcdh/*` workspace dep must
  set the `@ghentcdh/crouton` esbuild condition — same fix already in crouton-cli.
- **Schema export name**: `{Model}WithRelationsSchema` for models with relations,
  `{Model}Schema` for relation-less models (hasRelations flag in codegen classify).
- **Frontend ServeStaticModule**: the prod Docker image serves the Vue SPA from the NestJS backend
  on port 3000. The frontend vite build must output to `../public` (regular) or the backend must
  point `rootPath` at the copied `public/` dir.
- **`@ghentcdh/*` must be published** before a scaffolded app can `pnpm install`. The CLIs should
  print a clear warning in the next-steps output if the packages aren't yet on npm.
- **crouton-codegen is prompt-free**: no `@clack/prompts` dependency, no UI code. Keep it that way.
  All prompt logic lives in the CLI packages. If sharing the create-datasource runner, inject
  prompts via an adapter interface.
- **crouton-cli has no subpath exports**: currently bundles everything into `dist/index.js`. To
  import `runCreateDatasource` from another package, either extract it to codegen (with prompt
  adapter) or add subpath exports to crouton-cli (requires tsup multi-entry + package.json exports).
- **pnpm-workspace.yaml uses `packages/*`**: new packages under `packages/` are auto-discovered.
  No changes needed there.
- **nx.json release config**: currently lists `crouton-vue`, `crouton-forms-vue`, `crouton-api`,
  `crouton-cli`. Must add `create-crouton` and `add-crouton` if they should be released.
- **tsup esbuild conditions**: both new packages must set `conditions: ['@ghentcdh/crouton']` in
  esbuildOptions if they `noExternal`-bundle any `@ghentcdh/*` workspace dep (same fix as crouton-cli).
