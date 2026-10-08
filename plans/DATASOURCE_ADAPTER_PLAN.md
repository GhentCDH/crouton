Status: planned
# Datasource Adapter Plan

Turn the datasource from "a Prisma client" into an **adapter** that provides CRUD. Prisma
becomes the default adapter; a developer can supply a `custom` adapter. `data-source.json`
selects which. The adapter surface is *inspired by* today's `ReadRepository`/`WriteRepository`;
those become the Prisma implementation of it.

## Goal

- `DataSourceAdapter` is the data-access contract, keyed by model/resource:
  `create(model, data, ctx)`, `findAll(model, query, ctx)`, … For Prisma this is
  `this.prisma[model].create(data)`.
- Prisma is the default adapter (today's repositories moved behind the interface).
- A consuming developer can register a `custom` adapter without touching crouton internals.
- **Scope:** only `kind: "prisma" | "custom"` for now. No other built-in adapter until the
  seam has landed.

## Where we are today

- `crouton-core/.../data-source/DataSourceSchema.ts` — `DataSourceShape` already has a `type`
  field (default `postgres`). Today it is a **DB dialect** tag, read only by codegen to pick
  the Prisma provider. Runtime uses only `name`/`default`/`urlEnv`.
- `crud/data-source/data-source.loader.ts` — scans each datasource folder, parses
  `data-source.json`, imports `index.ts` whose **default export is a `PrismaClient`**.
- `data-source.registry.ts` — `Map<name, PrismaClient>`; `resolve(database)` returns the raw
  client; `disconnectAll()` calls `client.$disconnect()` (Prisma-specific).
- `crud-repository.factory.ts` — `createCrudRepository(prisma, config, dataSources, registry)`.
  Prisma resources build `ReadRepository`/`WriteRepository` over `prisma[config.model]`;
  `kind:"custom"` resources short-circuit to `createCustomRepository` (user `repository.ts`).
- `crouton-api.module.ts` `forResources()` validates each resource by poking `prisma[c.model]`;
  records failures to the status page instead of crashing.
- `crud-controller.factory.ts` resolves `prisma = registry.resolve(config.database)` and passes
  it into the factory.

### Two seams — don't confuse them

- **Per-resource custom repository** (`kind:"custom"` + `repository.ts`, already shipped) — one
  resource, developer writes its data access by hand.
- **Per-datasource adapter (this plan)** — one backend serving *all* resources bound to that
  datasource, keyed by model. Prisma is the default.

### The boundary problem to solve first

Hooks/decoration are applied in **different layers** on the two paths today, and unifying them
is the heart of this work:

- **Prisma path:** `ReadRepository`/`WriteRepository` call `decorateRows`/`decorateRow`/
  `prepareWrite`/`postWrite` *inside themselves*, passing `this.prisma`
  (`read.repository.ts:310,318`, `write.repository.ts:118,127,…`).
- **Custom path:** `custom-repository.adapter.ts` (the wrapper) applies the same helpers *around*
  the user repository.

Target boundary: **the adapter does pure data access; the framework wrapper owns everything
else** — filter parsing, id coercion, hooks, valueLabel/translation decoration, 404s, the list
envelope, calculated columns. That means hoisting hook/decoration calls *out of*
`ReadRepository`/`WriteRepository` and into one shared wrapper (the generalized
`custom-repository.adapter.ts`), so Prisma and custom adapters run through the same wrapper.

This is why the extraction is done in two phases (below): a **mechanical** wrap first (hooks stay
inside the Prisma adapter, behaviour identical, specs green), then a **hoist** that moves hooks to
the shared wrapper and lets hooks receive the adapter.

## Design

### 1. `DataSourceAdapter` interface (new, `crud/data-source`)

Per-datasource, resource-keyed. First arg is the model key so one instance serves many
resources. Surface mirrors `ReadRepository` + `WriteRepository`, including the child/sub-resource
ops.

```
interface DataSourceAdapter {
  readonly kind: string;              // "prisma" | "custom"
  readonly client?: unknown;          // raw backend handle for the escape hatch (Prisma => PrismaClient)

  // read
  findAll(model, query: NormalizedQuery, ctx): Promise<{ data: any[]; count: number }>;
  findOne(model, id, ctx): Promise<any | null>;

  // write
  create(model, data, ctx): Promise<any>;
  update(model, id, data, ctx): Promise<any>;
  patch?(model, id, data, ctx): Promise<any>;    // falls back to update
  delete(model, id, ctx): Promise<any>;
  upsert?(model, data, ctx): Promise<any>;        // PUT — Prisma-only for now

  // sub-resources (Prisma derives these from relations; optional elsewhere)
  findAllByParent?(model, parentId, sub, query, ctx): Promise<{ data: any[]; count: number }>;
  findOneChild?(model, sub, childId, parentId, ctx): Promise<any | null>;
  createChild?(model, parentId, sub, data, ctx): Promise<any>;
  updateChild?(model, sub, childId, data, ctx): Promise<any>;
  deleteChild?(model, sub, childId, parentId, ctx): Promise<any>;

  // lifecycle / introspection
  supports?(model): boolean;          // startup validation; omit when not introspectable
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
}
```

- **`model` vs "resourceId":** Bo's `create(resourceId, …)` maps to the Prisma model name
  (`config.model`), i.e. the delegate key `prisma[model]`. A resource is identified by
  `config.name`/`route`, but the *data-access key* is the model. The wrapper passes the model and
  puts the full `config` on `ctx`.
- **`NormalizedQuery`** is a backend-neutral shape: already-parsed filter/sort/pagination + the
  requested field set (`select`). `parseFilterString`/operators and `toSelectFields` move to the
  shared layer so every adapter gets the same input instead of raw `field:value:op` strings. The
  Prisma adapter turns it into a `where`/`select`; a custom adapter maps it to whatever it needs.
  (Introduced in phase 2 — see phasing.)
- **`ctx`** = `{ config, op, request?, parent?, id?, offset }` — the same shape custom repos
  already receive, plus `dataSource`/`prisma` for the escape hatch (see §4, §8).

### 2. `PrismaDataSourceAdapter` — the default adapter

Wraps today's data access: `create(model, data)` → `prisma[model].create(...)`; `client` → the
`PrismaClient`; `disconnect()` → `$disconnect()`. Phase 1 keeps `ReadRepository`/`WriteRepository`
intact (hooks still inside them); phase 2 strips hook calls out of them so the adapter is pure
data access.

### 3. Shared wrapper + `createCrudRepository` dispatch

Generalize `custom-repository.adapter.ts` into one wrapper that turns any `DataSourceAdapter`
into the full `CrudRepository` the controllers expect, running the framework layer
(hooks, decoration, id coercion, 404, envelope) uniformly.

`createCrudRepository(adapter, config, dataSources, registry)`:
- `kind:"custom"` → build a `DataSourceAdapter` from the user's `repository.ts`, then run it
  through the same wrapper (removes the separate custom code path over time).
- otherwise → wrap the datasource's adapter.

### 4. Registry holds adapters

`DataSourceRegistry`: `Map<name, DataSourceAdapter>`.
- `resolveAdapter(name?)` → adapter.
- `resolveClient(name?)` → `adapter.client` — backward-compat for `ctx.prisma`, action
  procedures, and the `prisma` escape hatch on `CrudRepository`.
- `disconnectAll()` → `adapter.disconnect?.()` (drops the `$disconnect` special-case; still used
  by the dev "restart backend" action).
- `DataSourceEntry` becomes `{ config; adapter }` (was `{ config; client }`).

### 5. `data-source.json` selector — **decided**

Add a distinct **`adapter`** field to `DataSourceShape`, default `"prisma"`. The existing `type`
field stays the Prisma DB dialect (postgres/mysql/…) — unchanged. Non-breaking: existing
`data-source.json` files with no `adapter` behave exactly as today. `adapter: "custom"` selects a
developer-supplied adapter.

### 6. Loader branches on the adapter

- `prisma` → import `index.ts` default export (a `PrismaClient`), wrap in
  `PrismaDataSourceAdapter`. Unchanged for every existing project.
- `custom` → `index.ts` default-exports a `DataSourceAdapter` (or a factory
  `(config) => adapter`); the loader uses it directly.

Record adapter-construction failures to the existing load-errors registry so they surface on the
status page instead of crashing boot.

### 7. Module validation becomes adapter-aware

In `forResources`, replace `prisma[c.model]` poking with `adapter.supports?.(c.model)` — skip the
check when the adapter doesn't introspect. Keep "record error, don't crash".

### 8. Hooks receive the adapter, not the raw client

Target: a hook (and a custom `repository.ts`) receives the **`DataSourceAdapter`**, so hook code
on a non-prisma datasource still has a data handle.

- Add `dataSource: DataSourceAdapter` to `WriteHookContext`/`ReadHookContext` and to
  `CustomRepositoryContext`. Keep `prisma` = `adapter.client` as a **deprecated alias** (typed
  `unknown`, `undefined` on non-prisma) so existing hook files keep working.
- Thread the adapter through the four `hooks.apply` helpers. After the phase-2 hoist the shared
  wrapper is the single caller, so it passes the adapter down in one place.
- **Type trap (already hit — see memory):** `ResourceHooks` is a `z.infer` of a Zod object, which
  erases the `PRISMACLIENT` generic — that is why `ctx.prisma` is `any` in every hook file. Since
  the context shape is changing anyway, hand-write `ResourceHooks`/`*HookContext` as interfaces
  (like `CustomRepository` was) so `ctx.dataSource` is actually typed.

## Files to touch (first pass)

- New: `crud/data-source/data-source.adapter.ts` (interface), `.../prisma.adapter.ts`
  (`PrismaDataSourceAdapter`), plus a tiny in-memory reference adapter under test fixtures.
- `crud/data-source/data-source.types.ts` — `DataSourceEntry.client` → `adapter`.
- `crud/data-source/data-source.registry.ts` — store adapters; `resolveAdapter`/`resolveClient`.
- `crud/data-source/data-source.loader.ts` — branch on adapter kind.
- `crud/crud-repository.factory.ts` + `crud/custom-repository/custom-repository.adapter.ts` —
  merge into one shared wrapper over `DataSourceAdapter`.
- `crud/read.repository.ts` + `crud/write.repository.ts` — become the Prisma adapter body; hoist
  hook calls out (phase 2).
- `crud/hooks/hooks.types.ts` + `hooks/hooks.apply.ts` — add `dataSource`, thread it, hand-write
  the interfaces.
- `crouton-api.module.ts` `forResources` — adapter-aware validation; `disconnectAll` path.
- `crud-controller.factory.ts` — resolve adapter instead of raw client.
- `crouton-core/.../DataSourceSchema.ts` — add `adapter` field (default `"prisma"`).
- `crouton-codegen/datasource-scaffold.ts` + `crouton-cli/create-datasource` — scaffold branch.

## CI & edges (easy to forget)

- **CI (`.github/workflows/merge-request.yml`)** runs `build`, `test`, `lint` via `nx run-many`
  on push/PR to main; new files are picked up automatically. `ci.yml.disabled` exists — leave it.
- **Schema-drift check** — the build job runs `git diff --exit-code` on
  `crouton-core/.../resource.schema*.json` + `docs/.vuepress/public/schema`.
  `resource.schema.json` is regenerated by `crouton-core/scripts/gen-resource-schema.mjs` (tsup
  `onSuccess`). The `adapter` field lives in `DataSourceShape`, not `ResourceJsonShape`, so it
  should *not* touch that JSON — but build crouton-core and check `git diff` before pushing.
- **`typecheck` is NOT in CI** and already fails on main across packages — compare error *sets*
  before/after, don't expect zero. Lint may already be dirty on touched files — `eslint --fix`.
- **Codegen / scaffolding** always emits Prisma schema/config/client + zod output. Branch:
  prisma → full scaffold; custom → just `data-source.json` + an `index.ts` adapter stub (+ types).
  `generatedTypesImport`/`zodOutput`/`clientOutput` are Prisma-only.
- **CLI** `crouton create-datasource` prompts for the adapter and routes to the right scaffold.
  `crouton update resources` and Prisma introspection (`prisma-shell.ts`) are Prisma-only — skip
  for custom datasources.
- **Migrations** (`migrations.json`, `prisma migrate`) are Prisma-only; a custom datasource owns
  its own schema lifecycle — document it.
- **Escape hatches** — `CrudRepository.prisma`, action procedures, custom-repo `ctx.prisma`
  assume a real `PrismaClient`; on a custom datasource they are `undefined`. Kept as
  `adapter.client`, documented Prisma-only (see §8).
- **Sub-resources / nested routes** are derived from Prisma relations — a custom adapter can't
  auto-derive children; declare explicitly or leave unsupported (as custom repos already do).
- **`upsert`/`upsertMany` (PUT)** — optional on the adapter; Prisma-only for now.
- **Dev tools** — "restart backend" calls `disconnectAll()` → `adapter.disconnect?.()`. The visual
  resource builder / dev datasource-write endpoints must understand adapter types.
- **BigInt `toJSON` patch** — global in the module; unaffected.
- **Docs** — add a "Datasources & adapters" page under `docs/`.

## Testing

- Prisma-adapter extraction must keep every existing `crud/adapter/*.spec.ts` green.
- A `DataSourceAdapter` **contract test suite** run against both the Prisma adapter and the tiny
  in-memory reference adapter (which also serves as the non-prisma example/fixture).
- Loader tests: prisma default export, custom adapter default export, unknown adapter → recorded
  load error, not a crash.
- Scaffold tests: custom adapter emits no Prisma files.

## Phasing (each phase ships green)

1. **Mechanical wrap.** Add the interface; `PrismaDataSourceAdapter` wraps
   `ReadRepository`/`WriteRepository` *as-is* (hooks still inside). Registry/loader/factory
   dispatch on the adapter; `resolveClient` preserves escape hatches. No config change, no
   behaviour change, `ctx.prisma` unchanged. — Genuinely mechanical; lowest risk.
2. **Hoist hooks + normalize the query.** Move hook/decoration out of the Prisma repositories
   into the shared wrapper; introduce `NormalizedQuery`; add `ctx.dataSource` (keep `ctx.prisma`
   as alias). — Behaviour-sensitive; isolated so it's easy to review.
3. **Config + loader.** Add the `adapter` field (default `prisma`), loader branching, adapter-aware
   validation.
4. **Reference adapter + contract tests + docs.**
5. **Codegen/CLI scaffold branching** for custom adapters.

## Status

Plan settled — no open decisions. Ready to start at phase 1.
