Status: implemented
# Docker Templates Update Plan (create-crouton)

Goal: bring the Docker templates emitted by `create-crouton` in line with the working
`mela` setup — split compose files, a modern NX_COMMAND-driven dev image, an
env-driven infra service, and a Caddy-based prod image — while respecting the new
placement rules and supporting **multiple crouton apps per repo**.

## Placement & naming rules (decided)

- **compose files** always live at the **repo root** (`targetDir`):
  - `compose.yml` — top-level, `include:`s the infra file plus every per-app file.
  - `compose.app.{app_name}.yml` — **one per crouton app**, so multiple apps can coexist.
  - `compose.infra.yml` — shared infra (postgres) for the whole repo.
- **Dockerfiles** live **next to `crouton.json`** (the "app folder"):
  - Regular layout (single NestJS app): `crouton.json` at repo root → Dockerfiles at repo root.
  - Nx layout without prefix: `crouton.json` at repo root → Dockerfiles at repo root.
  - Nx layout with prefix (multi-crouton): `crouton.json` under `<prefix>/` → Dockerfiles under `<prefix>/`.
- **Dev image is shared** (mela-style): one `Dockerfile.dev` per app; the app's
  `compose.app.{app_name}.yml` runs `frontend` and `backend` as two services off the same image,
  differentiated by `NX_COMMAND`.
- **Docker build context is always the repo root** (`.`) because the pnpm workspace root
  (`pnpm-workspace.yaml`, `pnpm-lock.yaml`) is at the repo root even when a prefix is used
  (`pnpm-workspace.yaml` lists `<prefix>/apps/*`). All `COPY` paths inside the dev/prod
  Dockerfiles are therefore relative to the repo root and must use the `{{appsRoot}}` token
  (`apps` or `<prefix>/apps`) rather than a bare `apps/`.

### Naming tokens

- `{{name}}` — the **repo** identifier (set at create time). Used for the shared network
  (`{{name}}-net`) and the postgres container (`{{name}}.data.app`).
- `{{appName}}` — the **crouton app** identifier = `prefix` when set, else `{{name}}`. Used for:
  - the per-app compose filename: `compose.app.{{appName}}.yml`,
  - the service names: `{{appName}}-frontend`, `{{appName}}-backend`.
- `{{envFile}}` — path to this app's env file, **next to its `crouton.json`**: `.env` for a flat/
  single-app repo, or `<prefix>/.env` for a prefixed app. Each app owns its own env file (ports,
  `DATABASE_URL`, NX vars); repo-shared infra config (`POSTGRES_*`) lives in a root-level env file.

So a flat repo yields `compose.app.<name>.yml` with services `<name>-frontend/-backend`; a
prefixed repo yields `compose.app.<prefix>.yml` with `<prefix>-frontend/-backend`. All apps join
the single `{{name}}-net` network declared by `compose.infra.yml` so every backend can reach postgres.

## Current state (what exists today)

Templates in `packages/create-crouton/templates/`:

- `docker/compose.yml.tmpl` — single file, hardcoded ports (5432/3000), `db` + `app` services, no healthcheck, no network, no include.
- `docker/Dockerfile.dev.tmpl` — `node:22-slim`, `CMD ["pnpm","dev"]`, no `--parents`, no secret mount, no NX_COMMAND.
- `docker/Dockerfile.prod.tmpl` — backend-only multi-stage node image.
- `docker/.dockerignore.tmpl`.
- `nx/workspace/apps/frontend/{Dockerfile,Caddyfile,docker-entrypoint.sh}.tmpl` — the frontend Caddy prod image (already matches mela; only its location needs review).

Generation logic in `packages/create-crouton/src/runner.ts`:

- `docker/*` templates are always rendered to `targetDir` (repo root) for both layouts. The output
  filename is derived from the template filename by stripping `.tmpl` (`loadAndRenderTemplates`),
  so a **dynamic** name like `compose.app.<appName>.yml` requires renaming the output path in code.
- Docker tokens include `regular:'true'` for the regular layout; `nx`, `frontend`, `prefix`,
  `appsRoot`, `name`, `dbName`, etc. for nx. `frontendApp`/`backendApp` already exist for nx.
- Frontend prod files render under `workspaceTarget/apps/frontend` (i.e. under the prefix).
- Render engine (`src/lib/render.ts`) supports only `{{key}}` and `{{#if key}}...{{/if}}`
  (non-greedy, so **no nested `#if` and no `else`**). Any new conditional logic must stay flat.

## Target state (from the mela working example)

1. `compose.yml` → `include:` the infra file + each `compose.app.{app_name}.yml`.
2. `compose.app.{app_name}.yml` → that app's services on the shared network, env-driven ports,
   built from the shared dev Dockerfile, each service carrying its own `NX_COMMAND`,
   `IS_DOCKER=true`, `WATCHPACK_POLLING=true`, and `.:/app` + anonymous-volume mounts.
3. `compose.infra.yml` → `postgres:17` with `pg_isready` healthcheck, env-driven port,
   `${POSTGRES_DATA_HOME}` data volume, `./docker/init-data` seed mount, and the shared network.
4. `Dockerfile.dev` → `node:24-alpine`, corepack pnpm, `COPY --parents apps/*/package.json
   libs/*/package.json generated/*/package.json`, `--mount=type=secret,id=npmrc`, `EXPOSE ${PORT}`,
   and `CMD pnpm exec nx run ${NX_COMMAND} --host 0.0.0.0 --port=${PORT}`.
5. Prod: keep the Caddy frontend image; keep/refresh the backend prod image.

## File-by-file changes

### 1. compose files (repo root)

`docker/compose.yml.tmpl` — include the infra file and this app's file. Written so add-crouton can
append additional `compose.app.*.yml` lines idempotently:

    include:
    {{#if postgres}}  - compose.infra.yml
    {{/if}}  - compose.app.{{appName}}.yml

`docker/compose.app.tmpl` — rendered out as **`compose.app.{{appName}}.yml`** (renamed in
`runner.ts`, see below). Network name is the repo-level `{{name}}-net`:

    networks:
      {{name}}-net:
        external: true

    services:
    {{#if frontend}}  {{appName}}-frontend:
        build:
          context: .
          dockerfile: {{dockerfileDev}}
        env_file: [{{envFile}}]
        ports:
          - "${FRONTEND_PORT}:${FRONTEND_PORT}"
        environment:
          - PORT=${FRONTEND_PORT}
          - NX_COMMAND={{frontendApp}}:dev
          - WATCHPACK_POLLING=true
          - IS_DOCKER=true
        volumes:
          - .:/app
          - /app/node_modules
          - /app/.nx
        networks: [{{name}}-net]
    {{/if}}  {{appName}}-backend:
        build:
          context: .
          dockerfile: {{dockerfileDev}}
        env_file: [{{envFile}}]
        ports:
          - "${BACKEND_PORT}:${BACKEND_PORT}"
        environment:
          - PORT=${BACKEND_PORT}
          - NX_COMMAND={{backendApp}}:serve
          - WATCHPACK_POLLING=true
          - IS_DOCKER=true
        volumes:
          - .:/app
          - /app/node_modules
          - /app/.nx
        networks: [{{name}}-net]

`docker/compose.infra.yml.tmpl` — owns and declares the shared network:

    networks:
      {{name}}-net:
        name: {{name}}-net

    services:
      postgres:
        container_name: {{name}}.data.app
        image: postgres:17
        env_file: [.env.infra]
        environment:
          POSTGRES_USER: ${POSTGRES_USER}
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
          POSTGRES_DB: ${POSTGRES_DB}
        ports:
          - "${POSTGRES_PORT}:5432"
        volumes:
          - ${POSTGRES_DATA_HOME}:/var/lib/postgresql/data
          - ./docker/init-data:/docker-entrypoint-initdb.d
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
          interval: 10s
          timeout: 5s
          retries: 5
        networks: [{{name}}-net]

Notes:
- **Postgres is optional.** Prompt the user *"Run PostgreSQL in Docker? (they may already have a
  DB)"* (default yes). When **no**: skip `compose.infra.yml` and the postgres service entirely, do
  not add it to the `include:` list, and leave `DATABASE_URL` pointing at their external DB. When
  **yes**: emit `compose.infra.yml` and the `./docker/init-data` folder. Gate the infra template
  and its include line on a `postgres` token / `opts.postgres` flag (and a `--no-postgres` /
  `--postgres` CLI flag alongside `--yes`).
- Because all files are combined by `include:`, the shared network must be declared once
  (infra, with `name:`) and referenced as `external: true` from each app file — OR skip the
  `external` flag and rely on compose merging identical `networks:` keys. Pick one and verify with
  `docker compose config`. (Merging is simpler; `external` is stricter. Plan assumes merge unless
  testing shows a conflict.)
- The `{{#if frontend}}` block adds the frontend service only when a frontend was selected.
- **Regular** layout has no NX: emit a single backend service that builds the regular dev image and
  uses `CMD ["pnpm","dev"]`. Since the engine has no `else`, gate nx vs regular service bodies with
  flat `{{#if nx}}` / `{{#if regular}}` blocks in the same template (mirrors `Dockerfile.prod.tmpl`).
- New token **`dockerfileDev`** (see runner.ts) = `Dockerfile.dev` (root) or `<prefix>/Dockerfile.dev`.
- **Compose interpolation caveat (important):** a service-level `env_file:` injects vars into the
  *container*, but the `${FRONTEND_PORT}` used in the **host** side of `ports:` is resolved by
  Compose at parse time from the shell / `--env-file` / a root `.env` — **not** from the service's
  `env_file`. Two clean options: (a) render the host ports **literally** into each generated
  `compose.app.<app>.yml` from the port tokens at generate time (keeps a single `docker compose up`),
  or (b) start each app with `docker compose --env-file <prefix>/.env -f compose.yml -f
  compose.app.<app>.yml up`. **Recommend (a)** — literal host ports, per-app `env_file` for the rest —
  so `docker compose up` still brings the whole repo up at once with no collisions.

### 2. Rewrite `docker/Dockerfile.dev.tmpl` (nx, shared)

    # syntax=docker/dockerfile:1.7-labs
    FROM node:24-alpine
    WORKDIR /app
    RUN corepack enable && corepack prepare pnpm@latest --activate
    ENV CI=true

    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
    COPY --parents {{appsRoot}}/*/package.json libs/*/package.json {{generatedGlob}}/*/package.json ./

    RUN --mount=type=secret,id=npmrc,target=/app/.npmrc pnpm install

    EXPOSE ${PORT}
    CMD pnpm exec nx run ${NX_COMMAND} --host 0.0.0.0 --port=${PORT}

- `{{appsRoot}}` and a new `{{generatedGlob}}` (`generated/default` or `<prefix>/generated/default`)
  keep the `--parents` copy correct under a prefix.
- Secret build requires `docker build --secret id=npmrc,src=.npmrc ...`. In compose, add a
  `secrets:` block or document the manual build for private `@ghentcdh` packages. Decide whether to
  emit the secret mount unconditionally or only when a `.npmrc` is present.

### 3. Regular layout dev image

Single NestJS app, no NX — slim dev image:

    FROM node:24-alpine
    WORKDIR /app
    RUN corepack enable && corepack prepare pnpm@latest --activate
    ENV CI=true
    COPY package.json pnpm-lock.yaml ./
    RUN --mount=type=secret,id=npmrc,target=/app/.npmrc pnpm install
    EXPOSE ${PORT}
    CMD ["pnpm","dev"]

Cleanest: one `Dockerfile.dev.tmpl` with two flat `{{#if nx}}` / `{{#if regular}}` bodies.

### 4. Prod images

- Keep `nx/workspace/apps/frontend/{Dockerfile,Caddyfile,docker-entrypoint.sh}.tmpl` (Caddy) — it
  already matches mela and renders under `<workspaceTarget>/apps/frontend` (correct, next to the app).
- Refresh `docker/Dockerfile.prod.tmpl` (backend) to `node:24-alpine`, keep multi-stage.
- No prod compose (mela ships none; prod images are built + pushed in CI) unless requested.

### 5. `.env` templates (per-app + shared infra)

Each crouton app owns its **own** env file, placed **next to its `crouton.json`** (so it renders
from the existing `nx/workspace/.env.tmpl` / `regular/.env.tmpl`, which already land at
`workspaceTarget` = root or `<prefix>/`). Repo-shared Postgres config lives in a separate
root-level `.env.infra`.

Per-app `.env` (next to `crouton.json`) — app runtime + its own ports (no cross-app collisions):

    DATABASE_URL={{dbUrl}}
    FRONTEND_PORT=4200
    BACKEND_PORT=3000

Root `.env.infra` (only when Postgres runs in Docker) — shared DB config:

    POSTGRES_USER=crouton
    POSTGRES_PASSWORD=crouton
    POSTGRES_DB={{dbName}}
    POSTGRES_PORT=5432
    POSTGRES_DATA_HOME=./var/pgdata

- The app service references its file via `env_file: [{{envFile}}]` (`.env` or `<prefix>/.env`);
  postgres references `.env.infra`. Ship matching `.env.example` variants.
- Because each app has its own env file and its own ports, adding a second app cannot collide — as
  long as the two apps pick different `FRONTEND_PORT`/`BACKEND_PORT` values (add-crouton picks the
  next free pair).
- **Host-port interpolation caveat still applies** (see the compose caveat above): the `${...}` in
  the *host* side of `ports:` is not read from a service `env_file`. Recommended resolution:
  render host ports **literally** into each `compose.app.<app>.yml` from the port tokens, and keep
  `env_file` for everything the *container* needs (`DATABASE_URL`, `PORT`, NX vars).
- Frontend `vite.config.ts` proxy currently targets `http://localhost:3000`; inside Docker it must
  target the backend **service name** (`http://{{appName}}-backend:${BACKEND_PORT}`) when
  `IS_DOCKER`. Flag as a follow-up.

### 6. `.dockerignore`

Extend to ignore `.nx`, `var/`, `dist`, `.env*` (keep `.env` out of images).

## `runner.ts` changes

1. Add tokens: `appName` (`prefix || name`), `dockerfileDev` (`Dockerfile.dev` or
   `${prefix}/Dockerfile.dev`), `envFile` (`.env` or `${prefix}/.env`), `generatedGlob`. Ensure `frontendApp`/`backendApp` are available for
   the compose `NX_COMMAND` values.
1b. Add a **postgres prompt** (`resolvePostgres`, default yes) + `--postgres/--no-postgres` flag,
    setting a `postgres` token. When false, skip rendering `compose.infra.yml`, drop its
    `include:` line, and skip `docker/init-data/`.
2. Route docker outputs to different targets and **rename the per-app compose file**:
   - `compose.yml`, `compose.infra.yml`, `.dockerignore` → `targetDir` (root).
   - `compose.app.tmpl` → `targetDir/compose.app.${appName}.yml` (explicit rename; the generic
     `.tmpl`→strip logic can't produce a dynamic name).
   - `Dockerfile.dev` (+ backend `Dockerfile.prod`) → `workspaceTarget` (root or `<prefix>/`), i.e.
     next to `crouton.json`, instead of always `targetDir`.
   Implement via a per-file destination map rather than one wholesale render of `docker/`.
3. Create `docker/init-data/.gitkeep` in the output so the infra volume mount does not fail.
4. Update the "Next steps" note (`docker compose up -d`; mention the npmrc secret build if kept).
5. Keep `dist/templates/` in sync via the package build (do not hand-edit).

## add-crouton / existing-project changes

`add-crouton` (which already has a `docker` option) adds a crouton app to an **existing** repo.
The docker step must be defensive about what is already there:

1. **Root `compose.yml` already exists** → do **not** overwrite it. Parse its `include:` list and
   **append** `- compose.app.{app_name}.yml` only if absent (idempotent). If the file has no
   `include:` key yet, add one. If there is no `compose.yml` at all, create it from the template.
2. Emit this app's `compose.app.{app_name}.yml` at the repo root and its `Dockerfile.dev` next to
   the new app's `crouton.json`. If a `compose.app.{app_name}.yml` with that name already exists,
   warn and skip (or require `--force`) rather than clobbering.
3. **Ask whether to run PostgreSQL in Docker** (same prompt as create). If the repo already has a
   `compose.infra.yml` (or the user says they have their own DB), do **not** add another postgres
   service — reuse the existing infra and shared network. Only create `compose.infra.yml` +
   `docker/init-data/` when the user opts in and none exists.
4. **Provide an init folder**: ensure `docker/init-data/` exists (with `.gitkeep`) so the
   `/docker-entrypoint-initdb.d` mount is valid; users drop `*.sql` / `*.sh` seed scripts there.
5. Reuse the existing shared network (`{{name}}-net`); write the new app's **own** `.env` next to
   its `crouton.json` with a free `FRONTEND_PORT`/`BACKEND_PORT` pair (scan sibling apps' env files
   to pick non-colliding ports). Do not touch other apps' env files. Create `.env.infra` only if
   Postgres was opted in and none exists.

Implementation note: editing an existing `compose.yml`/`.env` means **read-modify-write**, not
template render — do it in code (YAML-aware or line-aware append) and keep it idempotent so
re-running add-crouton is safe.

## Edge cases / open questions

- **Shared network declaration**: merge identical `networks:` keys vs `external: true` — verify with
  `docker compose config`.
- **Ports**: each app owns its `.env` with its own port pair; add-crouton scans siblings for a free
  pair. Host-port `${...}` interpolation should be rendered literally (see caveat).
- **Secret npmrc**: always emit vs gate on `.npmrc` presence.
- **Prefix + build context**: verify prefixed `generated/` resolves under the root build context.
- **Vite proxy target** inside Docker (service name vs localhost).

## Testing

1. Scaffold each variant into a temp dir and inspect tree + rendered files:
   - `regular`; `nx` no prefix (backend only / backend+frontend); `nx` with `--prefix split`.
2. Assert: compose files at root with correct `compose.app.<appName>.yml` name and include list;
   Dockerfiles next to `crouton.json`; `COPY --parents` + `dockerfile:` context resolve.
3. `docker compose config` on each output (validates include + network merge + `.env` interpolation).
4. Add a second app via add-crouton; confirm the include list gains one line, infra is untouched,
   and both apps' services appear in `docker compose config`.
5. `docker compose build` for nx+frontend and prefixed cases.
6. `pnpm build` `create-crouton` and re-run to confirm `dist/templates/` regenerated.

---

## Suggested commit message

```
chore(create-crouton): modernize docker templates + per-app compose

- split compose into compose.yml (include) + compose.app.<app>.yml (one per crouton app) + compose.infra.yml at repo root
- shared NX_COMMAND-driven Dockerfile.dev (node:24-alpine, corepack pnpm, --parents, npmrc secret)
- env-driven ports, postgres healthcheck, POSTGRES_DATA_HOME volume, init-data seed mount, shared <name>-net network
- place Dockerfiles next to crouton.json (root, or <prefix>/ for multi-crouton), context at repo root
- add appName/dockerfileDev/generatedGlob tokens; rename per-app compose + route outputs in runner.ts
- teach add-crouton to append compose.app.<app>.yml to an existing root include (idempotent) and reuse shared infra
- make postgres/compose.infra.yml optional via prompt (existing external DB) and always provide docker/init-data
- per-app .env next to each crouton.json (own ports, DATABASE_URL) + shared root .env.infra for POSTGRES_*
```
