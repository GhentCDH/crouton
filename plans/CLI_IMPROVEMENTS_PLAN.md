# Crouton CLI — Improvement Plan

Goal: turn `@ghentcdh/crouton-cli` from a thin set of scaffold/update commands into
a coherent, self-describing tool with a real `--version`, consistent UX, and a way
to **stamp / validate `$schema` on existing `resource.json` files** — not just on
files it happens to rewrite. The schema-versioning machinery already exists in
`crouton-core` + `crouton-codegen`; this plan closes the gaps around *applying* it.

---

## 1. Current state

Commands registered in `src/index.ts`:

| Command | Purpose | Notes |
|---------|---------|-------|
| `update resources` | Introspect DB → create/update `resource.json` | Re-stamps header only when a file already changes |
| `update translations` | Regenerate/merge translation bundles | Alias of `translations update` |
| `translations init` / `translations update` | Manage i18n bundles | — |
| `create-resource` | Scaffold a config-only (`kind: custom`) resource | — |
| `create-datasource` | Scaffold a datasource | — |
| `add datasource` (`src/commands/add.ts`) | — | **Dead stub**: empty action, not wired into `index.ts` |

What already works (do **not** rebuild): every generated/updated `resource.json`
is stamped via `withResourceHeader` (`crouton-codegen/src/serialize.ts`) with

```json
"$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
"schemaVersion": 1
```

`CURRENT_RESOURCE_VERSION = 1`, migration engine + `runResourceMigrations` are in
place (`crouton-core/src/lib/resource/{version,migrations}`). The header URL is
built from the version, so it stays correct across future bumps.

---

## 2. Gaps & priorities

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| 1 | No command to **stamp/backfill `$schema` + `schemaVersion` on existing files**. `update resources` only rewrites a file when its columns change, so pre-stamping or hand-authored `resource.json` files never gain the header. | Files silently lack `$schema` → no editor validation/autocomplete | **P0** |
| 2 | No **`validate`** command — nothing checks existing `resource.json` files against the published schema / runs migrations to confirm they load. | Errors only surface at runtime | **P0** |
| 3 | `--version` is **hardcoded** `'0.0.1'` in `index.ts`; real package is `0.0.1-alpha.x`. | `crouton --version` lies | P1 |
| 4 | Dead `add datasource` stub (`add.ts`) — empty, unregistered. | Confusion / rot | P1 |
| 5 | Every command action repeats the same `try/catch → console.error → exitCode = 1` boilerplate. | Inconsistent error UX, duplication | P1 |
| 6 | `--cwd` handling is inconsistent: `update`/`translations` `resolve()` it; `create-resource`/`create-datasource` pass it raw to the runner. | Subtle path bugs | P1 |
| 7 | No CLI-level tests (command wiring, flag parsing). Runners are tested in codegen; registration is not. | Regressions in flags go unnoticed | P2 |
| 8 | Thin discoverability: no examples in `--help`, no top-level grouping. `create-resource` (top-level) vs datasource-under-`add` naming is inconsistent. | Onboarding friction | P2 |

---

## 3. P0 — schema stamping & validation for existing files

### 3a. `crouton stamp` (backfill the header)

New command that walks every `resource.json` under the resources dir and, for each:

1. Parse the raw JSON.
2. `runResourceMigrations(raw)` → upgrade from its `schemaVersion` (missing ⇒
   `BASELINE_RESOURCE_VERSION`) to `CURRENT_RESOURCE_VERSION`.
3. Re-serialize through `withResourceHeader` + `serializeResourceJson` so `$schema`
   and `schemaVersion` lead the file in canonical key order.
4. Write only when the serialized text actually differs (diff-friendly, idempotent).

Flags (mirror the existing commands for consistency): `--cwd`, `-p/--prefix`,
`-m/--models <list>`, `--dry-run`, `-y/--yes`. Reuse the file-discovery helpers in
`crouton-codegen/src/project.ts` (`resourceDirs`, the `resource.json` readers) —
keep the fs walk in codegen, not the CLI, per the package-boundary rule in
`CLAUDE.md`.

This is the direct answer to "add schema version to resource files": one command
that stamps the exact `$schema` URL onto files that predate stamping.

### 3b. `crouton validate` (verify, don't write)

Same walk, but read-only: parse → migrate in-memory → validate against the
compiled `ResourceJson` schema (reuse `parseSchema` from `crouton-api`/core).
Report per-file: OK / needs-stamp (version behind) / invalid (with the error).
Non-zero exit on any invalid file so it can gate CI. `--dry-run` of `stamp` and
`validate` overlap — implement `stamp --dry-run` as a thin call into the same
report.

---

## 4. P1 — CLI hygiene

- **Real version**: import the version from `package.json` (`with { type: 'json' }`)
  and pass it to `.version(pkg.version)`.
- **Remove `add.ts`** (or, if `add datasource` is intended as an alias of
  `create-datasource`, wire it to `runCreateDatasource` instead of leaving it
  empty). Recommend delete + fold into a documented alias later.
- **Shared action wrapper**: extract the repeated `try/catch` into a
  `runAction(fn)` helper so every command reports errors identically and sets
  `process.exitCode`. Collapses ~5 duplicated blocks.
- **Normalize `--cwd`**: resolve `cwd` (and `prefix`) once in a shared helper used
  by all commands, so `create-resource`/`create-datasource` behave like `update`.

---

## 5. P2 — polish

- **CLI tests** (vitest): assert each command registers, parses its flags, and
  forwards them to the runner (mock the runner). Add a `stamp`/`validate`
  golden-file test on a fixture resources dir.
- **`--help` examples**: add `.addHelpText('after', …)` with a couple of real
  invocations per command.
- **Docs**: a short CLI reference page under `docs/` listing every command, its
  flags, and the stamp/validate workflow; link the published schema URL.

---

## 6. Suggested sequencing

1. **P0** — `stamp` + `validate` (share the walk/report core in codegen). Ship
   first; it is the highest-value, user-visible gap.
2. **P1** — version fix, delete dead stub, action wrapper, cwd helper (small,
   low-risk; can ride along with P0's PR or a follow-up).
3. **P2** — tests + docs.

No `schemaVersion` bump or new migration is required for any of this —
`CURRENT_RESOURCE_VERSION` stays `1`; the work is about *applying* the existing
header to files that lack it and proving they validate.
