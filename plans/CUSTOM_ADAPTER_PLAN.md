Status: planned
# Custom Adapter Plan

Refines `DATASOURCE_ADAPTER_PLAN.md` with one decision and one invariant:

1. **`kind` and `adapter` are orthogonal.** A resource served by a **custom adapter**
   must **not** be marked `kind: "custom"`. "Custom" is declared once, on the
   **datasource** (`adapter: "custom"` in `data-source.json`). The resource only
   names its `database`.
2. **The framework never touches Prisma directly.** Every CRUD call goes through the
   `DataSourceAdapter`. Prisma is just the default adapter — a wrapper you extend to
   *add* functionality, never a client the core reaches into.

## The problem

Today the word "custom" means two different things that have been collapsed into one flag:

| Axis | Lives on | Question it answers | Values |
|------|----------|---------------------|--------|
| **Resource `kind`** | `resource.json` | Where does this resource's *schema/columns* come from, and does it bring its own per-resource data access? | `prisma` \| `custom` |
| **Datasource `adapter`** | `data-source.json` | Which *backend* serves every resource bound to this database? | `prisma` \| `custom` |

`kind: "custom"` currently bundles **two** unrelated things:
- schema-from-columns (`buildViewsFromColumnTypes`, no generated `schema.ts`), **and**
- per-resource data access via a hand-written `repository.ts`.

So a resource that lives on a non-Prisma backend is forced to be `kind: "custom"` and hand-write
`repository.ts`, *even when the whole datasource already has one custom adapter that could serve it.*
That is the conflation to remove.

### The example, fixed

```jsonc
// resource.json — WRONG: conflates resource-kind with datasource-adapter
{ "kind": "custom", "id": "example", "name": "Example", "database": "annotation-db" }
```

```jsonc
// resource.json — RIGHT: a plain resource that names its database and its adapter key
{ "id": "example", "name": "Example", "model": "example", "database": "annotation-db",
  "columns": { /* … */ } }
```

```jsonc
// data-source/annotation-db/data-source.json — "custom" is declared HERE, once
{ "name": "annotation-db", "adapter": "custom" }
```

`model` here is the **adapter resource key** (what the adapter's `findAll(model, …)` receives),
not a Prisma delegate. It defaults to `id` when omitted, so most custom-adapter resources need
only `database` + `columns`.

> Note: simply deleting the `kind: "custom"` line does **not** work today — the loader's
> preprocess re-derives `kind = model ? "prisma" : "custom"`
> (`ResourceJson.schema.ts` `buildResourceJsonSchema`), so a modelless resource falls straight
> back to `custom`. Fixing this needs the schema/loader changes in Phase A below, not just a
> config edit.

## Target model

Decouple the two axes:

- **`adapter` (datasource) decides data access.** Resolved at API load from `data-source.json`.
  - `prisma` adapter → requires a Prisma `model`; reaches `prisma[model]`.
  - `custom` adapter → uses `model` (default `id`) as its resource key; **no `repository.ts` needed**.
- **`kind` (resource) decides schema source only.**
  - `prisma` → generated `schema.ts` from a Prisma model.
  - `custom` → json_schema assembled from `columns` (`buildViewsFromColumnTypes`).
- **`repository.ts` becomes an optional per-resource override**, detected by file presence on *any*
  resource, independent of `kind`. It stops being the thing `kind: "custom"` implies.

How the axes compose:

| `kind` | datasource `adapter` | Meaning |
|--------|----------------------|---------|
| prisma | prisma  | Today's default. Unchanged. |
| custom | prisma  | Columns-typed resource with a per-resource `repository.ts` on a Prisma DB (today's shipped custom-resource feature — still valid). |
| custom | custom  | **Bo's case.** Columns-typed resource served by the datasource's one custom adapter. No `repository.ts`. |
| prisma | custom  | Prisma-typed resource served by a custom adapter (allowed; unusual). |

Net effect for Bo: a resource on `annotation-db` is a **plain resource** (`columns` + `database`),
never `kind: "custom"`. The custom behaviour is written once as the `annotation-db` adapter.

## The invariant: no Prisma in the core

Enforce point 2 — the framework must reach Prisma *only* through `PrismaDataSourceAdapter`.
Direct Prisma access surviving in the core today (all to be routed through the adapter):

- `crud/crud-repository.factory.ts:121` — `const model = prisma[config.model]`.
- `crud/read.repository.ts` — `this.prisma[sub.childModel]` (544, 655) + `this.prisma` threaded
  into hooks/decoration throughout.
- `crud/write.repository.ts` — `this.prisma[sub.childModel]` (305, 370, 439) + `this.prisma` in hooks.
- `crud/crud-controller.factory.ts:72` — `registry.resolve(resource.database)` returns the raw client.
- `crud/operations/register-actions.ts:22,50` — `action.procedure(this.repo.prisma, …)` (escape hatch —
  keep, but source it from `adapter.client`, documented Prisma-only).
- `crouton-api.module.ts:83` — `resolveAdapter(c.database).client` for validation.

Target: the adapter interface grows the CRUD surface (`findAll/findOne/create/update/patch/delete`
+ child ops) already sketched in `DATASOURCE_ADAPTER_PLAN.md §1`; `ReadRepository`/`WriteRepository`
become the *body* of `PrismaDataSourceAdapter`; the shared wrapper owns hooks/decoration/404/envelope
and calls the adapter, never `prisma[...]`. `registry.resolve()` (raw client) is deleted from core
call sites and survives only as `resolveClient()` for documented escape hatches.

## Composable Prisma adapter (point 3)

A custom adapter extends the default rather than reimplementing CRUD. Export the class and a factory
from `crouton-api`:

```ts
// data-source/annotation-db/index.ts
import { PrismaDataSourceAdapter } from '@ghentcdh/crouton-api';
import { prisma } from './client';

export default class AnnotationAdapter extends PrismaDataSourceAdapter {
  constructor() { super(prisma); }

  // Add functionality; delegate the rest to the Prisma default.
  override async findAll(model, query, ctx) {
    const result = await super.findAll(model, query, ctx);
    return decorateWithAnnotations(result);
  }
}
```

Requirements this puts on the design:
- `PrismaDataSourceAdapter` must implement the **full** CRUD surface (after the Phase-2 hoist), so
  `super.*` is meaningful for every method.
- Methods must be independently overridable — no method reaching into another's private state in a way
  that breaks a partial override.
- The loader already accepts a default-exported adapter *or* a factory
  (`data-source.loader.ts`) — also accept a **class** (`typeof exported === 'function'` → `new exported()`),
  so the `export default class … extends PrismaDataSourceAdapter` form above loads.

## Phasing

Builds on the DATASOURCE_ADAPTER_PLAN phases (Phase 1 mechanical wrap has landed: interface, registry,
loader, `PrismaDataSourceAdapter` lifecycle-only). This plan adds:

- **Phase A — decouple `kind` from data access (config + validation).**
  - `ResourceJson.schema.ts`: stop treating a missing `model` as automatically `kind: "custom"`.
    Make `model` optional; move "model is required" out of static `refineByKind` and into the
    **Prisma adapter** at load (Prisma adapter needs a model; custom adapter does not).
  - Treat `repository.ts` presence as the per-resource-override signal, decoupled from `kind`.
  - Keep `kind` meaning schema-source only; `custom` still assembles json_schema from columns.
  - Update `crud-repository.factory.ts` / `crud-controller.factory.ts` dispatch to branch on the
    resolved **adapter**, not on `config.kind`.
- **Phase B — full CRUD on the adapter + hoist (= DATASOURCE_ADAPTER_PLAN phase 2).**
  Move hooks/decoration into the shared wrapper; adapter does pure data access; delete every direct
  `prisma[...]` from the core per the invariant above.
- **Phase C — composable Prisma adapter.** Export `PrismaDataSourceAdapter` + factory from the package
  public API; loader accepts a class; document the extend pattern.
- **Phase D — validation, scaffold, docs.** Adapter-aware `forResources` validation
  (`adapter.supports?.(model)`); CLI/codegen scaffold a custom-adapter datasource stub that
  `extends PrismaDataSourceAdapter`; docs page on "kind vs adapter" with the corrected example.

## Migration

- Resources currently `kind: "custom"` **only because** they sit on a non-Prisma backend → convert to
  plain resources on a `adapter: "custom"` datasource; delete their `repository.ts`; move that logic into
  the one datasource adapter.
- Resources that are `kind: "custom"` for genuine **per-resource** hand-written access on a Prisma DB →
  unchanged.
- Non-breaking for every existing Prisma project: no `adapter` key = `prisma`; no `kind` + a `model` =
  `prisma`. Only modelless-resource auto-`custom` derivation changes (Phase A) — audit existing configs
  for modelless resources before shipping A.

## Decisions to confirm

- **Keep `kind: "custom"` or rename?** Recommended: keep it (means "schema from columns + optional
  per-resource repository.ts"), because it stays valid on a Prisma DB. Alternative: split into an explicit
  `schema: "columns"` and let `repository.ts` presence stand alone — cleaner, larger blast radius.
- **`model` default for custom adapters** — recommended default `id`. Confirm the adapter key you want
  (`id` vs `name` vs `route`).
- **Prisma-typed resource on a custom adapter** (`kind: prisma` + `adapter: custom`) — allow, or reject at
  load until there's a use case?

## Files to touch

- `crouton-core/src/lib/resource/ResourceJson.schema.ts` — `model` optional; drop model→custom auto-derive;
  move "model required" to the adapter; `kind` = schema-source only.
- `crouton-core/src/lib/data-source/DataSourceSchema.ts` — `adapter` field already present; no change.
- `crouton-api/src/lib/crud/data-source/data-source.adapter.ts` — add the CRUD surface (Phase B).
- `crouton-api/src/lib/crud/data-source/prisma.adapter.ts` — implement full CRUD (host `ReadRepository`/
  `WriteRepository` bodies); overridable methods.
- `crouton-api/src/lib/crud/data-source/data-source.loader.ts` — accept a class export.
- `crouton-api/src/lib/crud/crud-repository.factory.ts` + `crud-controller.factory.ts` — dispatch on
  resolved adapter, not `config.kind`; drop `prisma[config.model]` / `registry.resolve`.
- `crouton-api/src/lib/crud/read.repository.ts` + `write.repository.ts` — hoist hooks; no direct
  `this.prisma[...]`.
- `crouton-api/src/lib/crouton-api.module.ts` — adapter-aware `forResources` validation.
- `crouton-api` public entry — export `PrismaDataSourceAdapter` + factory.
- `crouton-codegen` / `crouton-cli` — custom-adapter datasource scaffold; skip Prisma introspection there.
- `docs/` — "Datasources & adapters" page: kind vs adapter + the corrected example.

## CI & traps (from memory / existing plan)

- CI runs `build`/`test`/`lint` via `nx run-many`; `typecheck` is **not** in CI and already fails on main —
  compare error *sets* before/after, don't expect zero. Lint may be dirty on touched files — `eslint --fix`.
- Build `crouton-core` and `git diff --exit-code` the generated `resource.schema*.json` — making `model`
  optional **will** change that JSON (unlike the `adapter` field, which lives in `DataSourceShape`).
  Regenerate via `crouton-core/scripts/gen-resource-schema.mjs` and commit the drift.
- `z.infer` erases generics — hand-write `ResourceHooks`/`*HookContext`/`CustomRepository` as interfaces
  so `ctx.dataSource` is typed (not `any`).
- Sub-resources derive from Prisma relations; a custom adapter can't auto-derive children — declare
  explicitly or leave unsupported.
