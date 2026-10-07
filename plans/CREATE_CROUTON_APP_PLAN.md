# `npx create-crouton-app` — Implementation Plan

Goal: turn the `create-crouton-app` placeholder into an interactive scaffolder that creates a runnable crouton project
in a single directory — backend (NestJS + `@ghentcdh/crouton-api`), Prisma wired to a single `DATABASE_URL`, a
`crouton.config` + empty enum registry, `.env`, Docker dev/prod, and the glue so `crouton update resources` works
immediately after.

```
npx create-crouton-app                # interactive
npx create-crouton-app my-app         # name as arg
npx create-crouton-app my-app --nx --yes --no-install
```

---

## 1. Prompts (interactive, `@clack/prompts`)

1. **Project name** (arg or prompt). Validate: non-empty, npm-safe (`/^[a-z0-9][a-z0-9._-]*$/`), and the target dir is
   empty/creatable. Used for `package.json` `name`, the directory, and Docker image/compose names.
2. **Layout**: `nx` monorepo vs `regular` (single package). See §3.
3. **Package manager**: detect from the `npx` user agent (`npm_config_user_agent`) → default pnpm; allow npm/yarn/bun. (
   nx works best with pnpm.)
4. **Database**: provider — default PostgreSQL (the only one wired today: `@prisma/adapter-pg`). Offer to start a
   bundled Postgres via Docker compose (§6).
5. **Frontend** — included by default (Vue admin app with `@ghentcdh/crouton-vue`); opt out with `--no-frontend`. *
   *Decided: include by default.**
6. **Starter content** — **empty** (no models/resources) or **with a sample model** (a `Note` model + generated
   resource). **Decided: prompt the user** (`--sample` / `--empty` flags).
7. **Git init** + **install deps** (both default yes; `--no-install`, `--no-git`, `--yes` to skip prompts).

`--yes` accepts all defaults (CI). Every prompt has a flag equivalent.

## 2. Templating strategy

Embed templates **inside the package** (shipped in `dist`), rendered with a tiny placeholder pass (`{{name}}`,
`{{pmRun}}`, `{{dbProvider}}`, year, etc.) — no network, works offline, version-locked to the CLI. Avoid a templating
engine; a `replaceAll` over a known token set is enough. Two template trees: `templates/regular/` and `templates/nx/`,
plus shared fragments (prisma, docker, env). The CLI is bundled self-contained (same tsup `noExternal` + `createRequire`
banner + dist `package.json` as `crouton-cli`); template files live under the emitted `dist/` and are read at runtime
via `import.meta.url`-relative paths.

## 3. Two layouts

**Regular (single package)** — simplest; one `package.json`, no monorepo tooling:

```
my-app/
  package.json            # scripts: dev, build, start, prisma:*, crouton
  tsconfig.json
  .env  .env.example  .gitignore  .nvmrc  README.md
  crouton.json
  crouton.enums.json      # {}
  prisma/
    schema.prisma         # generator client + zod; datasource WITHOUT url
  prisma.config.ts        # url = env("DATABASE_URL")  (Prisma 7)
  src/
    main.ts               # Nest bootstrap
    app.module.ts         # CroutonApiModule.forResourceDir(resources, data-sources, {...})
    data-sources/
      default/
        data-source.json  # { "type": "postgres", "name": "default", "default": true }
        index.ts          # PrismaClient + PrismaPg adapter from DATABASE_URL
    resources/            # empty (or one sample resource if --sample)
  docker/
    Dockerfile.dev  Dockerfile.prod  compose.yml  .dockerignore
  (frontend/ if included)
```

**Nx monorepo** — mirrors `new_polities`: `nx.json`, `pnpm-workspace.yaml`, `apps/backend` (NestJS), `apps/frontend` (
Vue, optional), `generated/types` (zod-prisma-types output as a workspace package), `libs/` placeholder, root
`prisma/` + `prisma.config.ts` + `crouton.json` + `crouton.enums.json`. `crouton.config.resourcesDir` =
`apps/backend/src/app/resources`. Pin nx + `@nx/*` to one version.

`crouton.json` paths and `enumsFile` differ per layout — generate accordingly so `crouton update resources` and the
enum-registry walk-up both work.

## 4. Database wiring (single `DATABASE_URL`)

- `.env` / `.env.example`: `DATABASE_URL="postgresql://crouton:crouton@localhost:5432/{{name}}?schema=public"`.
- `prisma/schema.prisma`: `generator client` (+ `zod-prisma-types` generator → `generated/types` in nx, `src/generated`
  in regular) and `datasource db { provider = "postgresql" }` **with the `url` commented/omitted** — Prisma 7 forbids
  `url` in the schema (we hit this). Connection comes from `prisma.config.ts`.
- `prisma.config.ts`:
  `import "dotenv/config"; export default defineConfig({ schema, migrations, datasource: { url: env("DATABASE_URL") } })`.
- `data-sources/default/index.ts`:
  `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })` (matches
  `@prisma/adapter-pg` usage). `data-source.json`: `{ type, name: "default", default: true }`.
- **Starter content (prompted):** with `--sample`, add a `Note { id, title, body, created_at, updated_at }` model to
  `schema.prisma` plus a generated `resources/note/` so `prisma migrate dev` + `crouton update resources` produce a
  working CRUD immediately; with `--empty`, ship a minimal schema (datasource + generators only) and an empty
  `resources/`.

## 5. crouton config + registry

- `crouton.json` filled for the chosen layout (`resourcesDir`, `dataSourcesDir`, `generatedTypesImport`,
  `schemaExportName: "{Model}WithRelationsSchema"`, one `default` datasource → `prismaSchema` +
  `urlEnv: "DATABASE_URL"`).
- `crouton.enums.json`: `{}` (registry seeded on first `crouton update resources`).
- Wire `@ghentcdh/crouton-cli` as a devDependency so `pnpm crouton update resources` works; `app.module.ts` calls
  `CroutonApiModule.forResourceDir(...)` and (for prod) can pass `{ enumsFile }` so the registry resolves in the built
  image.

## 6. Docker

- **`Dockerfile.dev`**: node base, install deps, run `prisma generate`, `CMD` the dev server (watch). Bind-mounts source
  via compose.
- **`Dockerfile.prod`**: multi-stage — build stage (install, `prisma generate`, build), runtime stage (slim node, copy
  `dist` + `prisma` + `crouton.enums.json` + `resources` so the loader finds them, non-root user, `CMD node dist/main`).
  Note the runtime must include `crouton.enums.json` and resource `*.json` next to the built app (we learned the loader
  reads these at runtime).
- **`compose.yml`** (dev): `db` (postgres:16 with volume + healthcheck) + `app` (build Dockerfile.dev, `env_file: .env`,
  `depends_on db healthy`, ports). `DATABASE_URL` points at the `db` service host.
- `.dockerignore` (node_modules, dist, .git, .env).

## 7. Post-scaffold steps

1. Write files (skip/confirm if the target dir is non-empty).
2. `git init` (+ initial commit) unless `--no-git`.
3. Install deps with the chosen PM unless `--no-install`.
4. `prisma generate` (best-effort; warn on failure — needs deps).
5. Print **next steps**: start Postgres (`docker compose -f docker/compose.yml up -d db`), `prisma migrate dev`,
   `crouton update resources`, run dev. Use the detected PM in the printed commands.

## 8. Things worth deciding / easy to miss

1. **`@ghentcdh/*` deps — decided: assume published.** Write normal semver ranges for `@ghentcdh/crouton-api`/`-vue`/
   `-core`/`-cli` in the generated `package.json`. ⚠️ Prerequisite: these must actually be published to npm (with the
   packaging fix applied) before a scaffolded app will install/run. Until then the scaffold is a non-runnable template —
   note this clearly in the generated README and the CLI's final output.
2. **Prisma 7 specifics** (already learned): no `url` in `datasource`; `prisma.config.ts` + adapter; `db pull`/
   `generate` via the project's prisma. The generated schema must follow this or `crouton update resources` / generate
   will fail.
3. **Runtime asset shipping**: `resource.json` files and `crouton.enums.json` must be deployed next to the compiled
   app (Dockerfile.prod copy step + `forResourceDir(..., { enumsFile })`), or the loader won't find them — exactly the
   gap we hit in this session.
4. **Frontend init**: if included, scaffold `useCrouton().init(useApi(), {...})`, the API base URL, CORS in the backend,
   and dev ports (api 3000 / web 4200 like new_polities).
5. **Tooling configs**: tsconfig(s), eslint + prettier, `.nvmrc`/`engines`, `.editorconfig`. For nx, the `@nx/*` plugin
   set + `project.json`s.
6. **Auth**: crouton has no built-in auth in the scaffold — leave a clearly-marked placeholder/hook rather than implying
   security.
7. **Migrations & seed**: include a `prisma/seed.ts` stub and `prisma migrate dev` in the quick-start; decide whether to
   run an initial migration automatically (probably not — needs a live DB).
8. **Name/dir safety**: refuse to overwrite a non-empty dir without `--force`; validate the npm name; lowercase/slug the
   dir.
9. **Telemetry/offline**: fully offline (embedded templates), no network calls during scaffold.
10. **Version pinning**: pin crouton + nx + prisma + node versions in the templates so a fresh scaffold is reproducible;
    the CLI's own version stamps the generated `package.json`.
11. **`create-crouton-app` packaging**: reuse the self-contained-dist + bundled-deps approach already in place; add
    `@clack/prompts`/`picocolors` (bundled) and ship the `templates/` tree in `dist`.

## 9. Implementation phases

1. Switch `create-crouton-app/src/index.ts` from the placeholder to an interactive flow (`@clack/prompts`) + flags; add
   name/dir validation.
2. Build the **regular** template tree + renderer (write files, token replace); wire prisma/`DATABASE_URL`
   /data-source/crouton.config/enums/docker.
3. Add the **nx** template tree (mirror new_polities) behind the layout choice.
4. Post-scaffold: git init, install, `prisma generate`, next-steps output; `--crouton-path` local linking.
5. Smoke-test: scaffold both layouts into a temp dir, `pnpm install`, `prisma generate`, boot the backend, run
   `crouton update resources` on the sample model.
6. Packaging: bundle templates into `dist`, keep the self-contained dist `package.json`, publish flow alongside the
   other CLIs.

## 10. New dependencies (CLI)

`@clack/prompts`, `picocolors` (bundled via tsup `noExternal`). Templates are data files, not deps. The scaffolded
project's deps (`@ghentcdh/*`, `@nestjs/*`, `prisma`, `@prisma/adapter-pg`, `zod`, `zod-prisma-types`, nx `@nx/*` for
the nx layout, Vue + `@ghentcdh/crouton-vue` for the frontend) are written into the generated `package.json`, not the
CLI's.
