Status: planned
# Create-Crouton — "Create a New Project" Improvement Plan

Goal: make `create-crouton` scaffold a project that is as close as possible to a
real, deployable crouton app — using the working **`balance` / `polysplit`** repo
as the reference. The Docker *dev* templates already match `balance` (see
`DOCKER_TEMPLATES_PLAN.md`, shipped in `2e496f7`). This plan covers what is still
missing: **production deploy, CI/CD, i18n, a fix in the combined prod image, and
CLI UX**.

---

## 1. Reference: what `balance/polysplit` has that a scaffold should have

`balance` is an Nx + pnpm monorepo with a `polysplit` prefixed crouton app. Beyond
the dev Docker setup the generator already emits, the real project carries:

| Area | `balance/polysplit` | `create-crouton` today | Gap |
|------|---------------------|------------------------|-----|
| Dev Docker (compose + Dockerfile.dev) | ✅ | ✅ (matches) | — |
| Single-container **prod** Dockerfile (backend + Caddy) | ✅ `polysplit/Dockerfile` | ✅ `docker/Dockerfile.prod.tmpl` | ⚠️ Caddyfile mismatch (see §3) |
| **Prod deploy compose** (pull published image) | ✅ `polysplit/compose.yml` | ❌ (only dev compose) | **P0** |
| **CI/CD** build+push workflow | ✅ `.github/workflows/docker-build.yml` | ❌ | **P0** |
| **DB backup** service | ✅ `prodrigestivill/postgres-backup-local` | ❌ | P1 |
| **i18n** (crouton.json block + `translations/*.json`) | ✅ | ❌ | **P1** |
| `deploy.sh` helper | ✅ | ❌ | P2 |
| Cloudflared tunnel service | ✅ | ❌ | P2 (opt-in) |
| Shared workspace libs (`packages/*`) | ✅ auth-nest/vue, components-vue | ❌ workspace lists only `apps/*` + `generated/*` | P2 |
| Local dev-link helper (`tools/scripts/link`) | ✅ | ❌ | P2 (crouton-dev only) |
| `--sample` resource | flag exists, unused | ❌ no sample templates | P1 (wire or drop) |

---

## 2. Priorities

- **P0 — makes the scaffold actually deployable:** prod deploy compose + `.env.prod`, and the GitHub Actions build/push workflow.
- **P1 — parity with current crouton features:** i18n scaffolding, DB backup service, and finishing (or removing) `--sample`.
- **P2 — nice-to-have / opt-in:** `deploy.sh`, cloudflared, shared-lib scaffold, dev-link helper.

---

## 3. Bug to fix first: combined prod image reuses the wrong Caddyfile

`docker/Dockerfile.prod.tmpl` (the `nxFrontend` path) builds a **single container**
that runs `node backend/main.js` **and** `caddy`, and copies:

```
COPY {{appsRoot}}/frontend/Caddyfile /etc/caddy/Caddyfile
```

But `apps/frontend/Caddyfile.tmpl` is the **frontend-only** Caddyfile: it listens on
`:9000`, roots at `/srv`, and has **no `/api` reverse_proxy**. In the combined image
the frontend is copied to `/srv/frontend` and the backend runs on `:3000`, so this
Caddyfile serves the wrong directory and never proxies the API. `balance` solves
this with a **separate** `polysplit/Caddyfile`:

```
:80 {
    handle /api/* { uri strip_prefix /api; reverse_proxy localhost:3000 }
    handle { root * /srv/frontend; try_files {path} /index.html; file_server }
}
```

**Fix:** add a dedicated combined Caddyfile template (e.g.
`docker/Caddyfile.combined.tmpl`, listening on `:80`, root `/srv/frontend`, `/api`
→ `localhost:3000`), copy *that* into the combined prod image, and align the
exposed port (`80` not `9000`). Keep `apps/frontend/Caddyfile` only for the
frontend-only deployment path. Decide explicitly which prod topology is the
default (single combined container, as `balance` uses) and document the other as
optional to avoid the current two-conflicting-prod-paths confusion.

---

## 4. P0 — Production deploy compose + env

Add a prod compose that **runs the published image** rather than building locally,
mirroring `polysplit/compose.yml`. New templates under `docker/`:

- `compose.prod.yml.tmpl` — services:
  - `postgres` (reuse infra image/volume conventions),
  - `{{appName}}` → `image: ${IMAGE:-ghcr.io/OWNER/{{name}}:latest}`, `depends_on: postgres`, `ports: "${APP_PORT:-8080}:80"`, `env_file: .env.prod`, `restart: unless-stopped`,
  - (P1) `db-backup` (see §5).
- `.env.prod.tmpl` / `.env.prod.example.tmpl` — `IMAGE`, `APP_PORT`, `DATABASE_URL`, `POSTGRES_*`, `API_URL=/api`, `APP_VERSION`.

Runner changes (`renderDockerTemplates` in `src/runner.ts`): render these to
`targetDir`, gated behind a new `--prod-compose` option (default on when `--docker`
and a registry/owner is known; see §7). Keep image name parametric via a
`{{imageRepo}}` token (default `ghcr.io/<owner>/<name>`), where `<owner>` comes from
a new `--owner` flag or is left as a `REPLACE_ME` placeholder.

**Why:** today a fresh project can build a prod image but has nothing to run it in
production. This closes the last-mile gap to a deployable app.

---

## 5. P1 — DB backup service

Add the `prodrigestivill/postgres-backup-local` service (from `polysplit/compose.yml`)
to `compose.prod.yml` (and optionally `compose.infra.yml` for local parity), gated
behind `--backup` (default on when postgres is enabled). Env: `SCHEDULE=@daily`,
`BACKUP_KEEP_DAYS/WEEKS/MONTHS`, volume `${DB_BACKUP:-./backups}:/backups`.

---

## 6. P1 — i18n scaffolding

crouton now supports i18n (commit `86577bf`). `balance/polysplit/crouton.json` shows
the shape:

```json
"i18n": { "defaultLanguage": "nl", "languages": ["en","nl"], "translationsDir": "translations" }
```

Changes:
- Extend `nx/workspace/crouton.json.tmpl` (and `regular/crouton.json.tmpl`) to emit
  an `i18n` block when `--i18n` is passed, with `{{defaultLanguage}}` /
  `{{languages}}` tokens.
- Emit `translations/{{lang}}.json` stubs (`{}`) for each selected language.
- New CLI options: `--i18n`, `--languages en,nl`, `--default-language en`.
- Frontend: wire the `i18n/` setup in `apps/frontend/src` (the generator's frontend
  is currently minimal — add an `i18n` bootstrap only when `--i18n` is on).

---

## 7. P0 — CI/CD workflow

Generate `.github/workflows/docker-build.yml` from `balance`'s workflow: QEMU +
Buildx, login to `ghcr.io`, `docker/metadata-action` tag matrix, multi-arch
`linux/amd64,linux/arm64`, `cache-from/to: gha`. Parameterize:
- image name → `{{imageRepo}}`,
- dockerfile path → `{{workspaceRoot}}/Dockerfile.prod` (respects prefix),
- context → repo root.

New template dir `nx/root/.github/workflows/docker-build.yml.tmpl` (and a
`regular/.github/...` variant). Gate behind `--ci` (default on). The existing
template loader already walks nested dirs, so a `.github/...` path renders
automatically once added under the root template set.

**Note:** `loadAndRenderTemplates` strips only a trailing `.tmpl`; nested
`.github/workflows/*.yml.tmpl` → `.github/workflows/*.yml` works as-is.

---

## 8. P1 — Finish or drop `--sample`

`--sample` is declared in `src/index.ts` but never read in `runner.ts` and there are
no sample templates. Either:
- **(a)** add a `sample/` resource: a `resources/author.resource.json` (+ a matching
  Prisma model appended to `schema.prisma`) so `crouton update resources` produces a
  working CRUD out of the box and gives new users something to see; or
- **(b)** remove the flag to avoid a dead option.

Recommend **(a)** — it makes the very first `pnpm dev` show real UI, which is the
strongest onboarding signal.

---

## 9. P2 — Optional extras (opt-in flags, off by default)

- `deploy.sh` (`--deploy-script`): pull → down → up postgres → wait → up all →
  status/logs, from `polysplit/deploy.sh`.
- Cloudflared tunnel service in `compose.prod.yml` (`--cloudflared`), plus a
  `cloudflared/config.yml` stub.
- Shared-lib scaffold (`--with-libs`): create `packages/` with a starter lib and add
  `packages/*` + `libs/*` to `pnpm-workspace.yaml` (balance lists both).
- Dev-link helper (`--dev-link`, **for crouton contributors**): emit
  `tools/scripts/{link,unlink}` + `link.config.json` pre-pointed at local crouton
  packages, so a scaffolded app can develop against a local crouton checkout. This is
  exactly how `balance` consumes crouton via `pnpm-workspace.yaml` `overrides:`.

---

## 10. CLI surface (proposed additions)

```
--prod-compose / --no-prod-compose   emit compose.prod.yml + .env.prod   (P0)
--ci          / --no-ci              emit GitHub Actions build/push       (P0)
--owner <name>                       registry owner for image name        (P0)
--backup      / --no-backup          db-backup service                    (P1)
--i18n                               enable i18n scaffolding              (P1)
--languages <list>                   e.g. en,nl                          (P1)
--default-language <lang>                                                 (P1)
--deploy-script                      emit deploy.sh                       (P2)
--cloudflared                        cloudflared tunnel service           (P2)
--with-libs                          scaffold packages/ shared lib        (P2)
--dev-link                           local crouton dev-link helper        (P2)
```

Interactive prompts (`resolve*` helpers) get matching questions; all honor `--yes`
for non-interactive use. Add the new tokens (`imageRepo`, `owner`, `defaultLanguage`,
`languages`, `apiUrl`) to the token map in `runCreate`.

---

## 11. Testing

1. Scaffold each variant to a temp dir and inspect the tree:
   `regular`; `nx` no-prefix (backend-only / backend+frontend); `nx --prefix split`.
2. `docker compose -f compose.yml config` (dev) and `-f compose.prod.yml config` (prod) validate.
3. `docker build -f <workspaceRoot>/Dockerfile.prod .` builds; run the combined image
   and confirm `/` serves the SPA and `/api/...` reaches the backend (validates the §3 fix).
4. `act` or a dry-run lint of the generated workflow YAML; confirm image name + dockerfile path resolve.
5. With `--i18n`: `crouton.json` has the i18n block and `translations/*.json` exist.
6. With `--sample`: `pnpm dev` shows the sample resource CRUD end-to-end.
7. `pnpm build` `create-crouton` so `dist/templates/` is regenerated, then re-run.

---

## 12. Rollout order

1. §3 combined-prod Caddyfile fix (correctness).
2. §7 CI workflow + §4 prod compose/env (P0 — deployability).
3. §6 i18n + §5 backup + §8 sample (P1 — feature parity).
4. §9 opt-in extras (P2).

Keep each as its own PR-sized change; the token map and `renderDockerTemplates`
routing are the only shared touch-points.

---

## Suggested commit message

```
feat(create-crouton): production deploy, CI, and i18n scaffolding

- fix: combined prod image now uses a dedicated :80 Caddyfile (root /srv/frontend, /api -> :3000) instead of the frontend-only :9000 one
- add compose.prod.yml + .env.prod(.example) that run the published image (ghcr.io/<owner>/<name>) with postgres + db-backup
- add .github/workflows/docker-build.yml (QEMU + buildx, ghcr login, metadata tags, linux/amd64+arm64, gha cache), image/dockerfile parameterized
- add i18n scaffolding: crouton.json i18n block + translations/<lang>.json, --i18n/--languages/--default-language flags
- wire --sample to emit a starter resource so first `pnpm dev` shows real CRUD
- new flags: --prod-compose, --ci, --owner, --backup, --i18n, --languages, --default-language (+ P2: --deploy-script, --cloudflared, --with-libs, --dev-link)
- extend token map (imageRepo, owner, defaultLanguage, languages, apiUrl) and renderDockerTemplates routing
```
