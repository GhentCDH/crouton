Status: planned
# Playwright E2E + Demo App Plan

> Status: proposal. Goal: add an end-to-end testing layer on top of the existing
> vitest unit suite, driven by a real, in-repo demo app (`examples/book-collection`).

## 1. Why

crouton generates a full NestJS + Vue admin from `resource.json` files. The unit
suite (vitest, ~60 spec files across core/api/codegen/vue) covers builders,
schema parsing, and codegen in isolation — but nothing exercises the **generated
stack end to end**: a real HTTP request hitting a generated controller, a real
Prisma query, the `/schemas` response feeding real crouton-vue components, and a
user clicking through tables, forms, filters and relation pickers in a browser.

That integration seam is where crouton's complexity actually lives (relation
hydration, autocomplete label lookup, nested sub-resources, pagination, enum/status
display) and where regressions have historically slipped through. Playwright, run
against a real running demo app, closes that gap and doubles the demo app as living
documentation.

## 2. Locked decisions

| Decision | Choice | Note |
|---|---|---|
| Database | **SQLite** | Zero-setup, no Docker in CI. Postgres kept as optional later matrix (§9). |
| Demo app | **`examples/book-collection`**, in-repo | New nx workspace apps (`backend` + `frontend`), mirrors `create-crouton` output. Seeded via a Prisma seed script. |
| Test layers | **Full-stack E2E** + **Visual regression** | API-only and component (Playwright CT) tests explicitly out of scope for now. |
| Commit style | No merge requests opened by tooling; commit messages handed over in markdown for copy-paste. | Per project convention. |

### SQLite caveat (read before building)
The generated backend template uses `@prisma/adapter-pg` + `zod-prisma-types`.
For the demo we swap to a SQLite driver adapter (`@prisma/adapter-better-sqlite3`)
and a `provider = "sqlite"` schema. Consequences to design around:
- **No native enums.** Model `Book.status` as a `String` column and drive its
  allowed values through crouton's existing enum registry (`crouton.enums.json`),
  which is app-level, not DB-level — so this is representative, not a hack.
- **Introspection differences.** The demo commits its Prisma schema and generated
  client rather than relying on `crouton` introspecting a live Postgres DB. This
  keeps CI hermetic; the introspection/codegen path stays covered by the existing
  codegen unit tests.
- If any crouton-api code path hard-assumes pg at runtime, that's a genuine bug the
  demo will surface — capture it, don't paper over it.

## 3. Demo app architecture

Mirror the `create-crouton` nx workspace layout so the demo is a faithful sample:

```
examples/book-collection/
  apps/
    backend/            NestJS + @ghentcdh/crouton-api
      prisma/
        schema.prisma   provider = sqlite
        seed.ts         deterministic fixture data
        dev.db          gitignored; rebuilt per run
      src/
        app/
          app.module.ts CroutonApiModule.forResourceDir(...)
          resources/    *.resource.json  (the interesting part)
          data-sources/
        main.ts
    frontend/           Vue 3 + @ghentcdh/crouton-vue (CroutonPlugin + CroutonRouter)
  crouton.json
  crouton.enums.json
  e2e/                  Playwright project (see §5)
```

The demo consumes crouton via workspace links (`workspace:*`), so E2E runs against
the **local source**, not published packages — a change in `crouton-vue` is caught
by the demo's tests in the same PR.

## 4. Data model — book collection

Kept deliberately small, but every model is chosen to exercise a specific crouton
feature rather than for realism alone.

| Resource | Fields (highlights) | Relations | crouton feature exercised |
|---|---|---|---|
| `author` | name, bio (textarea) | `books` oneToMany | oneToMany → table display; searchable/filterable text |
| `category` | name, slug | `books` manyToMany | manyToMany relation editor |
| `book` | title, isbn, publishedYear (number), status (enum-as-string), summary | `author` manyToOne, `categories` manyToMany | **autocomplete label hydration** on edit (the known-tricky path), manyToOne picker, enum/status display, number + validation |
| `user` | name, email (unique) | `loans` oneToMany | unique constraint → create/validation errors |
| `loan` | loanedAt (date), returnedAt (nullable date) | `user` manyToOne, `book` manyToOne | nested sub-resource routes, date fields, nullable columns, two manyToOne pickers on one form |

This gives: list + detail + create + update + delete on each; pagination (seed
~30 books); search & filter; a manyToOne autocomplete that must show the human
label (not raw id) when editing an existing row; a oneToMany table on the author
detail; a manyToMany editor on books; an enum/status column; unique-email
validation; and nested loan routes under user/book.

Optionally add one `kind: "custom"` resource (e.g. a read-only `stats` view backed
by a hand-written `repository.ts`) so the custom-repository path gets an E2E, not
just unit, check — flagged as a phase-2 nice-to-have.

## 5. Playwright setup

- Root dev dep: `@playwright/test` (already present transitively in the workspace),
  plus a single `examples/book-collection/e2e/playwright.config.ts`.
- **`webServer`** block boots the whole stack before tests and tears it down after:
  1. rebuild `dev.db` from migrations + run `seed.ts` (fresh, deterministic state);
  2. start backend (`nest`/tsup) on a fixed port;
  3. start frontend (vite preview of a production build, or dev server) on a fixed port;
  4. `reuseExistingServer: !process.env.CI`.
- **Fixtures & page objects**: a small `fixtures/` layer — `croutonListPage`,
  `croutonForm`, `relationPicker` — so tests read as user intent, not selector soup.
  crouton-vue components should expose stable `data-testid` hooks; adding those where
  missing is part of phase 1 (small, isolated diffs to crouton-vue).
- **Determinism**: seed resets per test file (or per test via API teardown);
  time-sensitive fields use fixed dates from the seed; no reliance on ordering that
  pagination could change.
- **Trace/artifacts**: `trace: 'on-first-retry'`, screenshots + video retained on
  failure, uploaded as CI artifacts.

## 6. E2E scenario matrix (phase 1)

Grouped by the crouton capability under test, not by page:

1. **List + pagination** — books list renders columns from `/schemas`, paginates,
   page size correct, count matches seed.
2. **Search + filter** — filterable/searchable columns narrow results; clearing restores.
3. **Create** — new author via form, Zod validation errors shown for required/invalid
   fields, success redirects to detail/list, row appears.
4. **Update + autocomplete hydration** — open an existing book for edit; the
   `author` manyToOne shows the author's **name**, not the id (regression guard for
   the label-hydration bug); change it; persists.
5. **manyToMany** — add/remove categories on a book; reflected on reload.
6. **oneToMany display** — author detail shows its books table.
7. **Enum/status** — status column renders the mapped label; edit changes it.
8. **Unique constraint** — creating a second user with a taken email surfaces the
   API error in the form.
9. **Nested sub-resource** — create a loan under a user; nested route works; nullable
   `returnedAt` handled.
10. **Delete** — delete a row, confirm it's gone (guard against dialog-blocking per
    browser-automation rules).

Each maps to one or more existing unit specs so we can point at the layer that
*should* have caught a failure.

## 7. Visual regression

Layered on top of the same running app, kept intentionally narrow to avoid flake:
- `toHaveScreenshot()` on a **small, stable set**: the books list, a book edit form
  (relations populated), the author detail with its oneToMany table.
- Mask volatile regions (dates, ids) via `mask:`; disable animations; pin viewport
  and a single browser (Chromium) for snapshots.
- Baselines committed under `e2e/__screenshots__`; `--update-snapshots` documented in
  the demo README. Treated as **phase 3** — land functional E2E green first so
  snapshots aren't chasing a moving target.
- CI runs visual on Linux only (matching the baseline OS) to avoid font-rendering diffs.

## 8. CI integration

Add an `e2e` job to `.github/workflows/merge-request.yml`, gated with nx affected so
it only runs when crouton packages or the demo change:

- `pnpm install --frozen-lockfile`
- `pnpm exec playwright install --with-deps chromium`
- build crouton packages the demo depends on (`nx affected -t build` or explicit)
- `nx run book-collection-e2e:e2e` (wraps `playwright test`, which owns webServer)
- upload `playwright-report/` + traces + screenshot diffs as artifacts on failure.

Keep it a **separate job** from unit `test`, needing `install-deps`, so a slow/flaky
E2E never blocks the fast unit signal. Visual-regression assertions can start as a
non-blocking (continue-on-error) step until baselines are trusted, then flip to required.

## 9. Optional Postgres matrix (later)

Once SQLite E2E is stable, add a second CI variant using a Postgres **service
container** and the pg adapter, reusing the same specs via an env switch
(`E2E_DB=postgres`). This validates the real deployment path and native enums
without complicating the day-to-day PR run. Not in the initial scope.

## 10. Phasing & sequencing

- **Phase 0 — scaffold demo app.** Generate `examples/book-collection` (backend +
  frontend) wired to workspace crouton; SQLite Prisma schema; resources; seed;
  `nx run` targets for dev. Acceptance: `nx run book-collection-backend:serve` +
  frontend boots, admin UI lists seeded books manually.
- **Phase 1 — Playwright harness + happy-path E2E.** Config, webServer, fixtures,
  `data-testid` hooks in crouton-vue, scenarios 1–6. Acceptance: green locally + in CI.
- **Phase 2 — edge cases.** Scenarios 7–10, validation/error paths, optional custom
  resource E2E. Acceptance: matrix complete.
- **Phase 3 — visual regression.** Narrow snapshot set, baselines, CI wiring.
- **Phase 4 (optional) — Postgres matrix.**

## 11. Open questions

1. Confirm the SQLite driver adapter choice (`@prisma/adapter-better-sqlite3` vs the
   built-in) against the Prisma 7 version crouton pins.
2. Do we want the demo published to the docs site as a live sample, or purely a test
   fixture? (Affects whether the frontend gets extra polish.)
3. Are stable `data-testid`s acceptable to add to crouton-vue, or should selectors
   lean on roles/labels only? (Roles are more robust to markup churn but slower to write.)
4. Should the custom-repository (`kind: "custom"`) E2E be in phase 2 or deferred?

## 12. New / touched files (summary)

- **New**: `examples/book-collection/**` (backend, frontend, prisma, resources, e2e),
  its `playwright.config.ts`, nx `project.json`s, seed script, screenshot baselines.
- **Touched**: `.github/workflows/merge-request.yml` (add `e2e` job); `pnpm-workspace.yaml`
  (include `examples/*`); minor `data-testid` additions in `crouton-vue` components;
  root `.gitignore` (`dev.db`, `playwright-report`, `test-results`).
