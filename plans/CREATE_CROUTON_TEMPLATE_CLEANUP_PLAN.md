Status: planned
# create-crouton — Template Cleanup & Consolidation Plan

Hand this to Claude Code in a **fresh worktree created from `main`**. Do each step as
its own commit. Steps 1–6 are mechanical and low-risk. Steps 7–8 need investigation
and are flagged. The CI step (9) is optional/independent.

## Context — where things live

- Monorepo: pnpm + Nx. Package manager `pnpm@11.9.0`. Publishable packages are being
  consolidated from 8 → 4 (`crouton-core`, `crouton-vue`, `crouton-api`,
  `create-crouton`); `crouton-forms-vue`, `crouton-editor-vue`, `crouton-cli`,
  `add-crouton`, `crouton-codegen` become internal/private. See
  `PACKAGE_CONSOLIDATION_PLAN.md`.
- Scaffolder: `packages/create-crouton`. Its templates live under
  `packages/create-crouton/templates/{nx/root, nx/workspace/apps/{frontend,backend},
  nx/workspace/generated/default/{types,client}, regular, docker}`.
- Template tokens are Handlebars: `{{version}}` = the crouton package version
  (`__CROUTON_VERSION__`, falls back to `latest`); `{{name}}` = project scope
  (e.g. `planning-crouton`); `{{prefix}}` / `{{noPrefix}}` = Nx subfolder layout.
- Per-project dev CLI is `@ghentcdh/crouton-cli`, which provides the `crouton` bin
  (`crouton update|create-resource|create-datasource|translations`). CLI command
  defs: `packages/crouton-cli/src/commands/*.ts`; update orchestrator:
  `packages/crouton-cli/src/update/runner.ts`.

## Worktree setup

```bash
git fetch origin
git worktree add ../crouton-template-cleanup -b chore/template-cleanup origin/main
cd ../crouton-template-cleanup
```

> Note: these same edits (steps 1–6) currently exist **uncommitted** on branch
> `feat/resource-extensions`. Ignore that branch; redo cleanly here from `main`.

---

## Step 1 — Remove deprecated Vue packages from the frontend template

File: `packages/create-crouton/templates/nx/workspace/apps/frontend/package.json.tmpl`

Delete these two `dependencies` lines (now bundled into `crouton-vue`):

```
    "@ghentcdh/crouton-forms-vue": "{{version}}",
    "@ghentcdh/crouton-editor-vue": "{{version}}",
```

Commit: `chore(create-crouton): drop crouton-forms-vue/editor-vue from frontend template`

## Step 2 — Remove `crouton-cli` from backend & regular templates

- `packages/create-crouton/templates/nx/workspace/apps/backend/package.json.tmpl`
- `packages/create-crouton/templates/regular/package.json.tmpl`

In each, delete the `devDependencies` line:

```
    "@ghentcdh/crouton-cli": "{{version}}",
```

Commit: `chore(create-crouton): drop crouton-cli from backend/regular templates`

## Step 3 — Swap `crouton-cli` → `create-crouton` in the root (global) template

File: `packages/create-crouton/templates/nx/root/package.json.tmpl`

Replace the `devDependencies` line:

```
    "@ghentcdh/crouton-cli": "{{version}}",
```

with:

```
    "@ghentcdh/create-crouton": "{{version}}",
```

Commit: `chore(create-crouton): add create-crouton to root workspace devDependencies`

## Step 4 — Update `deps.ts` (used by the non-template add path)

File: `packages/create-crouton/src/lib/deps.ts`

```
// FRONTEND_DEPS.deps
- deps: ['@ghentcdh/crouton-vue', '@ghentcdh/crouton-forms-vue', '@ghentcdh/crouton-editor-vue', 'vue'],
+ deps: ['@ghentcdh/crouton-vue', 'vue'],

// BACKEND_DEPS.devDeps
- devDeps: ['@ghentcdh/crouton-cli', 'prisma', 'prisma-case-format', 'zod-prisma-types'],
+ devDeps: ['prisma', 'prisma-case-format', 'zod-prisma-types'],
```

Commit: `chore(create-crouton): drop deprecated pkgs from deps.ts dep sets`

## Step 5 — Add vee-validate to the frontend template

File: `packages/create-crouton/templates/nx/workspace/apps/frontend/package.json.tmpl`

Add to `dependencies` (keep alphabetical — before `"vue"`):

```
    "vee-validate": "5.0.0-beta.0",
```

> DECISION: the repo's `crouton-forms-vue` currently pins `vee-validate`
> **`5.0.0-beta.1`**. If "match" means align them, either bump this template to
> `5.0.0-beta.1` **or** drop `packages/crouton-forms-vue/package.json` to
> `5.0.0-beta.0`. Default: use `5.0.0-beta.0` in the template (as requested) and
> also set `crouton-forms-vue` to `5.0.0-beta.0` so they match. Confirm with Bo.

Commit: `chore(create-crouton): pin vee-validate 5.0.0-beta.0 in frontend template`

## Step 6 — Widen the generated workspace glob

File: `packages/create-crouton/templates/nx/root/pnpm-workspace.yaml.tmpl`

```
- {{prefix}}/generated/default/*
+ {{prefix}}/generated/**

- generated/default/*
+ generated/**
```

(Covers all datasources, not just `default`.)

Commit: `chore(create-crouton): widen generated workspace glob to generated/**`

## Step 7 — Nx: run `crouton update resources` from root with `--prefix`

Two edits.

**7a — CLI: add `-p` short alias.**
File: `packages/crouton-cli/src/commands/update.ts`

```
- .option('--prefix <name>', 'subfolder prefix (resolves cwd to <cwd>/<prefix>)')
+ .option('-p, --prefix <name>', 'subfolder prefix (resolves cwd to <cwd>/<prefix>)')
```

**7b — Scaffolder: don't `cd` into the app dir; run from workspace root.**
File: `packages/create-crouton/src/runner.ts` (inside `postScaffold`, the
"Run crouton update resources" block).

Replace:

```ts
        const croutonCwd = prefix ? resolve(targetDir, prefix) : targetDir;
        execSync('npx crouton update resources --yes', {
          cwd: croutonCwd,
          stdio: 'pipe',
          env: { ...process.env, DATABASE_URL: dbUrl },
        });
```

with:

```ts
        // In an Nx monorepo the CLI must run from the workspace root and target
        // the app via --prefix, so it can resolve nx.json / the pnpm workspace.
        const prefixArg = prefix ? ` --prefix ${prefix}` : '';
        execSync(`npx crouton update resources --yes${prefixArg}`, {
          cwd: targetDir,
          stdio: 'pipe',
          env: { ...process.env, DATABASE_URL: dbUrl },
        });
```

The printed "Next steps" note already emits `crouton update resources --prefix <p>`
(root-relative) — leave it.

Commit: `fix(create-crouton): run crouton update from workspace root with --prefix in Nx`

---

## Step 8 — (INVESTIGATE) Fix generated client package.json name

Symptom: after `crouton update resources`, the client's `package.json` keeps Prisma's
auto name `prisma-client-<hash>` instead of `@<name>/generated-default-client`
(e.g. `@planning-crouton/generated-default-client`).

Root cause candidates (verify both):
1. **Scope mismatch.** `packages/crouton-cli/src/update/runner.ts` →
   `ensureGeneratedScaffold` derives `projectName` from
   `loaded.config.title?.toLowerCase().replace(/\s+/g,'-')`. The workspace/tsconfig
   expects the project **name** scope (`@{{name}}/…`). If `config.title` ≠ the
   `@name` scope, the rename writes the wrong scope (or is skipped).
2. **Path mismatch.** The client branch only renames when
   `resolveFromRoot(root, ds.clientOutput)` is exactly the dir where Prisma 7's
   `prisma-client` generator writes its `package.json`. Confirm `ds.clientOutput`
   points at that dir (check `packages/crouton-codegen/src/datasource-scaffold.ts`
   and the generated `schema.prisma` `output`).

Fix:
- Rename the client `package.json` against the **workspace project scope** (read the
  scope from the root `package.json` `name`, or the same source the templates use for
  `{{name}}`), not `config.title`.
- Ensure `ensureGeneratedScaffold` runs **after** `prisma generate` (it does today —
  keep it) and that the client dir it targets matches Prisma's actual output dir.
- Force-set `name` + `private: true` on the existing file even when other fields
  differ (current code already does this when `name` differs — keep that path).

Verify by scaffolding a project named `planning-crouton` with a `default` datasource
and asserting `generated/default/client/package.json` → `name` is
`@planning-crouton/generated-default-client`.

Commit: `fix(crouton-cli): rename generated client pkg to workspace scope, not config.title`

## Step 9 — (INVESTIGATE / FEATURE) Support non-`public` schema in DATABASE_URL

Goal: support URLs like
`postgresql://planning:planning%402021@localhost:5432/planning?schema=planning`
(custom schema + `%40`-encoded password).

Where `public` is currently assumed:
- `packages/create-crouton/src/runner.ts` default URL
  (`…/${dbName}?schema=public`) and `resolveDbUrl` prompt placeholder.
- Prisma config / schema templates under
  `packages/create-crouton/templates/**/prisma/**` and codegen in
  `packages/crouton-codegen` (introspection / `db pull`).

Work:
1. Parse the `schema` query param from the resolved `DATABASE_URL` (keep the
   password URL-encoded; don't re-encode).
2. Thread the schema into the generated Prisma datasource block. For a single
   non-`public` schema, `db pull` honours the URL's `schema`; for multiple, add
   `schemas = ["<schema>"]` + the `multiSchema` preview feature to the generated
   `schema.prisma`, and set `@@schema("<schema>")` handling in codegen.
3. Make `crouton update resources` introspect the URL's schema rather than a
   hard-coded `public`.

This is a small feature, not a one-liner — spec/confirm scope with Bo before building.

Commit: `feat(create-crouton): honour custom schema in DATABASE_URL`

---

## Step 10 — (OPTIONAL) CI update

Current: `.github/workflows/ci.yml.disabled` = old npm + Nx Cloud (dead).
`merge-request.yml` ("Build") = live pnpm + nx, four jobs (install, build+schema-drift,
test, lint) that each re-install.

1. Delete `ci.yml.disabled`.
2. Add `typecheck` and `format:check` gates to `merge-request.yml` (root scripts exist).
3. Collapse the four re-installing jobs into one (or a matrix) —
   `nx run-many -t lint test build typecheck` — or switch to `nx affected`
   (build job already pulls `nrwl/nx-set-shas`).
4. Cache `.nx/cache` keyed on `pnpm-lock.yaml` + base sha.
5. Verify/pin action versions (`actions/checkout@v7`, `setup-node@v6`, `cache@v5`,
   `pnpm/action-setup@v6`) to known-good tags/SHAs.
6. Consolidation follow-up: confirm `crouton-forms-vue`, `crouton-editor-vue`,
   `crouton-cli`, `add-crouton` all carry `"private": true` (no `publishConfig`) so
   `nx release publish` (`publish.yml`) publishes only the 4 public packages.

Commit(s): one per sub-change, e.g. `ci: remove dead nx-cloud workflow`,
`ci: add typecheck + format gates`, `ci: consolidate build jobs with nx affected`.

---

## BLOCKER — `crouton` bin gap (do before shipping scaffolds)

Removing `crouton-cli` (steps 2–3) leaves the backend/regular templates'
`"crouton": "crouton"` script with nothing to resolve: `create-crouton` only exposes
the `create-crouton` bin, **not** `crouton`. Before generated projects can run
`crouton update`, `create-crouton` must also provide a `crouton` bin (fold in the
`crouton-cli` commands). Options:
- **(a)** Add a `crouton` bin to `create-crouton` that re-exports the cli commands
  (real consolidation), or
- **(b)** Keep `crouton-cli` as an internal (private, unpublished) dep of
  `create-crouton` and have `create-crouton`'s `crouton` bin delegate to it.

Decide with Bo; this gates the template changes being usable end-to-end.

## Verification (run before opening the PR)

```bash
# JSON templates still valid (strip handlebars first)
for f in packages/create-crouton/templates/**/package.json.tmpl; do
  node -e "const fs=require('fs');JSON.parse(fs.readFileSync('$f','utf8').replace(/\{\{[^}]*\}\}/g,'x'))" \
    && echo "OK $f" || echo "BAD $f"
done

pnpm -C packages/create-crouton run typecheck
pnpm -C packages/crouton-cli run typecheck

# End-to-end smoke: scaffold an Nx project, run update, assert generated client name
```
