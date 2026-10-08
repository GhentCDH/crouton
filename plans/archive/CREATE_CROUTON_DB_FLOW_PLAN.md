Status: implemented
# Plan: create-crouton DB flow + `crouton update resources` env fix

Issues seen running `npx @ghentcdh/create-crouton planning` (alpha.80) with a DB URL.

## 0. Publish `@ghentcdh/crouton-cli` and install it in generated projects

**Problem:** `pnpm crouton …` → `Command "crouton" not found`; `pnpm add -D @ghentcdh/crouton-cli` → 404.
`crouton-cli` is **never published**: it is missing from `release.projects` in `nx.json`. `create-crouton` only *bundles* it (tsup `noExternal`) and exposes only the `create-crouton` bin, so generated projects have no `crouton` binary. (`npx crouton` only works on machines with a local/global link.)

`crouton-cli` is already publish-ready: tsup bundles `crouton-codegen`, writes `dist/package.json` with `bin.crouton`, and `project.json` has `nx-release-publish` (`npm publish` from `dist`).

**Changes:**
- `nx.json` → add `"crouton-cli"` to `release.projects`.
- `packages/crouton-cli/package.json` → align version to `0.0.1-alpha.80` (now `alpha.48`) so the fixed release bumps it with the rest.
- Check the `dist/package.json` written by `onSuccess` also includes `publishConfig` + `files` correctly (it does for `publishConfig`); first publish needs npm access to the `@ghentcdh` scope.
- Templates:
  - `templates/nx/root/package.json.tmpl` → devDep `"@ghentcdh/crouton-cli": "{{version}}"` + script `"crouton": "crouton"`.
  - `templates/regular/package.json.tmpl` → same devDep (script already there).
  - `templates/nx/workspace/apps/backend/package.json.tmpl` → remove the `crouton` script (CLI runs from the workspace root).
- `packages/create-crouton/src/lib/deps.ts` → add `@ghentcdh/crouton-cli` to `BACKEND_DEPS.devDeps` (used by `add-crouton`).
- Optional: drop `@ghentcdh/create-crouton` from the generated root devDeps — it's a one-shot scaffolder, not a runtime tool.

**Workaround until published** (in an existing project): `pnpm add -D -w file:/path/to/crouton/packages/crouton-cli/dist` after `pnpm nx build crouton-cli`.

## 1. Skip "Run PostgreSQL in Docker?" when a DB URL is given

**File:** `packages/create-crouton/src/runner.ts` (~L87)

A provided URL means an external/existing DB → no Docker postgres.

```ts
const dbUrl = await resolveDbUrl(opts);
const postgres =
  opts.docker !== false && !dbUrl ? await resolvePostgres(opts) : false;
```

Docker *app* files (`Dockerfile.dev/prod`, compose) are still generated; only the postgres service is dropped.

## 2. Next steps: drop `prisma:migrate`, hide already-done steps

**File:** `runner.ts` §8 "Next steps" (~L281)

- Remove `prisma:migrate` from next steps entirely (DB-first: we pull, not migrate). Keep the script in the templates for people who want it — or remove too (decide).
- `postScaffold` returns `{ resourcesUpdated: boolean }`.
- Show `crouton update resources` only when it did **not** run successfully.
- Show `docker compose up -d` only when `postgres` is true.

```ts
const steps = [
  postgres ? 'docker compose up -d                 # start postgres' : null,
  !resourcesUpdated ? `${croutonCmd} update resources${prefixFlag}  # generate resource CRUD` : null,
  `${pmRun} dev                            # start dev server`,
];
```

## 3. Run `crouton` via the chosen package manager

**Files:** `packages/create-crouton/src/lib/pm.ts`, `runner.ts`, root templates

- Add helper in `pm.ts`:
  ```ts
  export const pmExec = (pm: PackageManager, bin: string) =>
    ({ pnpm: `pnpm exec ${bin}`, yarn: `yarn ${bin}`, bun: `bunx ${bin}`, npm: `npx ${bin}` })[pm];
  ```
- Use it in `postScaffold` (replace hardcoded `npx crouton update resources --yes`) and in next steps.
- devDep + root `crouton` script: see §0.

## 4. Fix `DATABASE_URL` not resolved by `prisma.config.ts`

**Root cause:** `loadDotenv()` in `packages/crouton-codegen/src/prisma-shell.ts` does `createRequire(import.meta.url)('dotenv')`. `dotenv` is not a dependency of `crouton-codegen`/`crouton-cli`, so the require throws, the `catch` swallows it, and `.env` is never loaded → `env('DATABASE_URL')` fails.

**Fix:** drop the `dotenv` dependency; use Node's built-in loader (Node ≥ 20.12):

```ts
const loadDotenv = (dir: string): void => {
  let d = dir;
  for (let i = 0; i < 6; i++) {
    const file = join(d, '.env');
    if (existsSync(file)) {
      process.loadEnvFile(file); // verify: must not override already-set vars (test covers it)
      return;
    }
    const parent = dirname(d);
    if (parent === d) break;
    d = parent;
  }
};
```

- Also pass `env: process.env` explicitly in `run()`'s `spawn` (defensive).
- Call `loadDotenv` from the CLI runner early (before `pullAndGenerate`), using `loaded.root`, so other prisma calls (e.g. `generate` with `--skip-pull`) also get it.
- Set `"engines": { "node": ">=20.12" }` in `crouton-cli` / `crouton-codegen`.
- Don't swallow silently: if no `.env` is found and `DATABASE_URL` is unset, log a warning naming the expected var.

## 5. Surface postScaffold failure

**Bug:** `postScaffold(opts, targetDir, pm, dbUrl)` is called **without `prefix`**, so the auto-run never gets `--prefix` in prefixed Nx layouts. Pass `prefix` through.


The auto-run `update resources` currently only warns with stderr in `dim`. Show the first error line clearly and keep the step in "Next steps" when it fails.

## Tests

- `create-crouton`: prompt flow test — with `--db-url`, `resolvePostgres` not called; next steps snapshot with/without successful update.
- `pm.ts`: `pmExec` per package manager.
- `crouton-codegen`: `loadDotenv` loads `.env` from a parent dir (tmp dir fixture), doesn't override an existing `process.env` var.
- Release dry run: `pnpm nx release --dry-run` lists `crouton-cli`; `dist/package.json` has `bin.crouton`.
- Manual: `npx create-crouton planning` with DB URL → no docker prompt, resources generated, then `pnpm crouton update resources` works without exporting env.

## Open questions

- Remove `prisma:migrate` script from templates too, or only from next steps?
- With a DB URL, still generate compose files (app only), or skip Docker entirely?

## Suggested commit message

```markdown
fix(create-crouton): streamline DB setup flow and load .env for prisma

- publish `@ghentcdh/crouton-cli` (add to nx release) and install it in generated projects

- skip "Run PostgreSQL in Docker?" when a database URL is provided
- remove `prisma:migrate` from next steps; hide `update resources` when it already ran
- run crouton through the selected package manager (`pnpm exec crouton`, ...)
- add `crouton` script to the root templates; pass `prefix` to postScaffold
- fix(crouton-codegen): load `.env` with `process.loadEnvFile` instead of an
  undeclared `dotenv` dependency, so `prisma.config.ts` resolves `DATABASE_URL`
```
