Status: planned
# Publish Drafts & Add Unlisted Resources to the Menu — Plan

Two closely-related dev-only capabilities, one mechanism:

1. **Turn off the `draft` flag** on a `resource.json` so a work-in-progress resource becomes
   loaded, served, and visible in the menu.
2. **Add a resource that isn't in the menu** — discover resource files on disk that aren't shown
   (because they're `draft`, or `sidebar.hide: true`, or otherwise unlisted) and flip the flags
   that surface them.

Both come down to: *mutate a top-level flag (`draft`, `sidebar.hide`) on a resource file addressed
by name, via a raw-preserving write, then let the dev hot-reload pick it up.* This mirrors the
sub-resource editor's write path, but addressed by **resource name/dir** (not CRUD route — a draft
has no route) and touching **top-level flags** (not columns).

Scope (all in `crouton`, all `IS_DEV`-gated):
- `packages/crouton-api/src/lib/crud/dev-tools/dev-resources.controller.ts` — the central
  `@Controller('_app/resources')` dev controller (already exists) gets discovery + flag endpoints.
- `packages/crouton-api/src/lib/crud/resource/` — a small raw-preserving flag writer + name→path
  resolver with a containment guard.
- `packages/crouton-vue/src/status/StatusView.vue` and/or `src/dev-tools/DevResourcesPanel.vue` +
  `src/composables/sidebar.ts` — the "Publish" / "Add to menu" affordances.

---

## 1. How it works today (the pieces we hook into)

- **`draft` excludes a resource from the served set.** `ResourceJson.schema.ts`:
  `draft: z.boolean().optional().default(false)`. In `crud/loader/index.ts`, after a successful
  read (and dev migration), `if (json.draft) { resourceLoadReportRegistry.record({ state:'draft',
  name: dir, path: jsonFile, version }); continue; }` — the resource is **not** pushed to
  `configs`, so it has no controller, no route, and is absent from CRUD, `/schemas`, and the menu.
  A `resource.ts` module draft is handled the same way.
- **Draft/loaded/hidden are all reported.** `resource-load-report.registry.ts` records `failed` /
  `migrated` / `draft` entries; `status.service.ts` (`getResourceStatus`) merges loaded configs
  (`valid:true`) with the report so `GET /crouton/status.json` already lists drafts as
  "valid-but-not-served". `StatusView.vue` renders them.
- **`sidebar` controls menu presence for a *loaded* resource.** `SidebarSchema`:
  `hide` (default false), `position`, `label`, `group`. `crouton-vue/src/composables/sidebar.ts`
  builds the menu from the loaded resources' `sidebar` config; `hide:true` keeps a served resource
  out of the menu.
- **A central dev controller already mutates resource files.** `DevResourcesController`
  (`@Controller('_app/resources')`, hard-gated on `IS_DEV`) reuses `@ghentcdh/crouton-codegen`
  (`listResourceNames`, `readExistingResource`, `serializeResourceJson`, `resolveFromRoot`,
  `loadConfig` → `resourcesDir`) to generate/plan/apply resource files by directory. It is the
  natural home for these actions because it works on **files**, not on registered routes — so it
  can touch a draft that no per-resource controller exists for. `DevResourcesPanel.vue` is its
  existing frontend.
- **Raw-preserving writes exist.** `crud/resource/WriteResourceJson.ts`
  (`readRawResourceJson`, `serializeResourceJson`, `writeRawResourceJson`, `validateResourceJson`)
  and codegen's identical `serializeResourceJson` — operate on the raw object, keep untouched keys
  byte-stable, validate with Zod only at the end. This is the write path both features must use.
- **Dev reload makes writes live.** `ResourceConfigRegistry.getAll()`/`getByRoute()` re-run
  `loader.loadAll()` per request in dev, so flipping `draft`/`hide` on disk is picked up on the
  next request — no restart. (Both features are therefore dev-only by nature.)

**The gap:** nothing flips these flags from the running app. Publishing a draft or un-hiding a
resource today means hand-editing the file. And there's no list of "files on disk that aren't in
the menu" to act on — the status page shows drafts but offers no action.

---

## 2. Target design

### 2.1 One raw-preserving flag writer (shared)

A pure-ish helper that flips a top-level flag on a raw resource.json and writes it back, keeping
the file idiomatic by **removing a key when it returns to its schema default** (so publishing
yields a clean, minimal git diff rather than an explicit `"draft": false`).

```ts
// crud/resource/ResourceFlags.ts  (new)
import { readRawResourceJson, serializeResourceJson, validateResourceJson,
         writeRawResourceJson, isPathWithin } from './WriteResourceJson';

export type ResourceFlagPatch = {
  draft?: boolean;                 // false => publish (remove the key)
  sidebar?: { hide?: boolean; group?: string | null; position?: number | null; label?: string | null };
};

/** Apply a flag patch to a raw resource.json, removing keys that hit their default. */
export const applyResourceFlagPatch = (
  raw: Record<string, unknown>,
  patch: ResourceFlagPatch,
): Record<string, unknown> => {
  const next = { ...raw };
  if (patch.draft !== undefined) {
    if (patch.draft) next['draft'] = true;
    else delete next['draft'];                       // default false -> drop the key
  }
  if (patch.sidebar) {
    const sidebar = { ...((next['sidebar'] as Record<string, unknown>) ?? {}) };
    for (const [k, v] of Object.entries(patch.sidebar)) {
      if (v === null || v === false) delete sidebar[k];   // null / default -> drop
      else sidebar[k] = v as unknown;
    }
    if (Object.keys(sidebar).length) next['sidebar'] = sidebar;
    else delete next['sidebar'];
  }
  return next;
};
```

The endpoints then do: `read raw → applyResourceFlagPatch → validateResourceJson → write`. Same
discipline as the sub-resource editor.

### 2.2 Resolve a resource by name → file path (containment-guarded)

Drafts have no route, so we address by the **directory name** the load report already uses
(`resourceLoadReportRegistry` entries carry `name = dir` and `path = jsonFile`). Resolve name →
path server-side against the configured `resourcesDir` and guard it — never accept a client-supplied
path directly:

```ts
// resolve `<resourcesDir>/<name>/resource.json` (or `<name>.resource.json`), assert it's inside
// resourcesDir with isPathWithin(). Reuse loadProject()/resolveFromRoot() already in the controller.
```

Prefer resolving from the load report's recorded `path` when available (it's authoritative for the
exact on-disk file, including the `foo.resource.json` naming), falling back to the
`<resourcesDir>/<name>/resource.json` convention, then containment-check the result.

### 2.3 Discovery: what exists on disk vs. what's in the menu

A single dev endpoint returns every resource file with a **state**, so the UI can show the ones
that aren't in the menu and offer the right action:

```
GET _app/resources/visibility  ->
  [{ name, path, state: 'in-menu' | 'hidden' | 'draft' | 'error', group?, position? }]
```

Compose it from two sources already in memory:
- **Loaded** resources (`configRegistry.getAll()`): `state = sidebar.hide ? 'hidden' : 'in-menu'`.
- **Not loaded** (`resourceLoadReportRegistry.getAll()`): `state = 'draft'` (or `'error'` for
  `failed`).

This is the "if a resource file is not in the menu, let me add it" list — `draft` and `hidden`
rows are exactly the not-in-menu resources, each addressable by `name`.

### 2.4 The action endpoints (on `DevResourcesController`)

```
POST  _app/resources/:name/publish        -> { draft: false }                (Feature 1)
POST  _app/resources/:name/add-to-menu     -> { draft: false, sidebar: { hide: false } }  (Feature 2)
PATCH _app/resources/:name/flags           -> body: ResourceFlagPatch         (general form)
```

- `publish` and `add-to-menu` are thin, intention-revealing wrappers over the general `flags`
  patch — nice for the UI and for clear audit/logging.
- `add-to-menu` optionally accepts `{ group, position, label }` so a resource can be dropped into a
  sidebar group in one call.
- Each: `assertDev()` → resolve name→path (guarded) → read raw (404 if missing) →
  `applyResourceFlagPatch` → `validateResourceJson` (400 on failure) → `writeRawResourceJson` →
  return the fresh `visibility` row (or the written raw). Dev reload then serves it / lists it in
  the menu on the next request.

Register these alongside the existing `@Post('plan'|'apply'|'sync'…)` handlers; the controller is
already `IS_DEV`-gated at registration (`crouton-api.module.ts`) and per-handler (`assertDev()`).

### 2.5 Frontend

Two entry points, pick per taste (the plan recommends both, they share the endpoints):

- **Status page (`StatusView.vue`).** Each `draft` row gets a **Publish** button
  (`POST …/:name/publish`); after success, invalidate the config/status query so the row flips to
  `in-menu`. A `hidden` row (new — surface `sidebar.hide` in the status payload) gets an
  **Add to menu** button. This directly answers "the file isn't in the menu → add it here."
- **Sidebar (`composables/sidebar.ts` + its component).** A dev-only "**+ Add resource**" affordance
  at the bottom of the menu opens a small picker fed by `GET _app/resources/visibility`, listing
  `draft` + `hidden` resources; picking one calls `add-to-menu` (optionally choosing a group), and
  the menu refetches. This is the most discoverable form of "add an unlisted resource to the menu."
- Reuse `DevResourcesPanel.vue`'s existing `_app/resources` API wiring for the calls.

---

## 3. Phasing

- **Phase 0 — flag writer + resolver.** `ResourceFlags.ts` (`applyResourceFlagPatch`) + name→path
  resolver with `isPathWithin` guard. Unit tests: publish drops the `draft` key; `sidebar.hide`
  false drops the key (and drops an emptied `sidebar`); group/position set; result validates;
  untouched keys byte-stable.
- **Phase 1 — discovery endpoint.** `GET _app/resources/visibility` composing loaded configs +
  load-report. Surface `sidebar.hide` (add `hidden`/`group`/`position` to the status/visibility
  payload). Tests for each state.
- **Phase 2 — action endpoints.** `POST :name/publish`, `POST :name/add-to-menu`,
  `PATCH :name/flags`. Dev-gated, guarded, validated, raw-preserving. Integration tests (temp
  resources dir): publish a draft → file loses `draft`, resource now in `getAll()` + menu on
  reload; add-to-menu a hidden resource → `sidebar.hide` removed; unknown name → 404; non-dev →
  403; path escape → 403.
- **Phase 3 — frontend.** Status-page Publish / Add-to-menu buttons + sidebar "+ Add resource"
  picker; refetch config/menu on success.
- **Phase 4 — verify** (below).

Phases 0–2 are backend-only and independently mergeable; the feature is usable via API before the UI.

---

## 4. Verification

- `pnpm nx run-many -t typecheck lint build` for crouton-api, crouton-core, crouton-vue.
- **Flag-writer unit tests:** publishing removes `draft` (not `draft:false`); un-hiding removes
  `sidebar.hide` and an emptied `sidebar`; setting `group`/`position` works; the merged object
  validates through `ResourceJsonSchema`; 2-space + trailing `\n`, every untouched key byte-stable.
- **Endpoint integration tests** (temp `resourcesDir` with a draft resource `foo` and a hidden
  resource `bar`): `POST foo/publish` → `foo/resource.json` loses `draft`, `configRegistry.getAll()`
  now includes `foo`, status flips `draft→in-menu`; `POST bar/add-to-menu` → `bar` no longer
  `sidebar.hide`; `GET visibility` reports `in-menu`/`hidden`/`draft`/`error` correctly; unknown
  name 404; `CROUTON_SCHEMA_EDITOR` off → 403; a `../` name → 403.
- **Existing specs stay green:** `status.service.spec.ts` (draft surfacing), loader tests,
  `WriteResourceJson` round-trip.
- **Manual smoke** (`CROUTON_SCHEMA_EDITOR=true`): create a resource with `draft: true`, confirm
  it's absent from the menu and shows on the status page; click **Publish**, confirm it appears in
  the sidebar + serves CRUD with no restart and the file diff is just the removed `draft` key. Set
  `sidebar.hide: true` on another, confirm it's served but not in the menu; use **+ Add resource**
  in the sidebar to add it, confirm it appears. Toggle `CROUTON_SCHEMA_EDITOR` off → the endpoints
  403.

---

## 5. Risks & notes

- **Dev-only, by nature and by gate.** Flipping `draft`/`hide` rewrites a checked-in file and only
  makes sense against a writable dev checkout with per-request reload — gated on `IS_DEV`
  (`CROUTON_SCHEMA_EDITOR`) at registration and per handler, plus a path-containment guard so a
  crafted `:name` can't escape `resourcesDir`.
- **Address by name, resolve server-side.** Never write to a client-supplied path. Resolve the
  name against `resourcesDir` (preferring the load-report's recorded path for the exact file name),
  then `isPathWithin`-check.
- **Remove-at-default keeps files clean.** Publishing deletes the `draft` key rather than writing
  `draft:false`; un-hiding deletes `sidebar.hide`. Minimal, idiomatic diffs — the same instinct as
  `withResourceHeader`/codegen serialization. (If the team prefers explicit `false`, it's a
  one-line change in `applyResourceFlagPatch`.)
- **`resource.ts` module drafts.** A resource defined via `resource.ts` (not JSON) is also
  draft-excluded, but can't be safely machine-edited. `publish` targets `resource.json` files; for
  a `.ts` draft, the endpoint should 400 with "publish TS-defined resources by editing the module"
  (the discovery row can flag `editable:false`).
- **Validation before serve.** A draft may have been parked precisely because it's incomplete.
  `validateResourceJson` runs before write, but a file can validate yet still be half-finished —
  publishing surfaces it to CRUD immediately. That's the intended semantics (draft off = live);
  the status page remains the place to catch a subsequently-failing resource.
- **Menu vs. served are distinct.** `add-to-menu` may need to clear **both** `draft` (to serve it
  at all) and `sidebar.hide` (to show it) — the combined wrapper does both so "add to menu" always
  results in a visible, served resource, which is what the phrase means to a user.
- **Sub-resource files aren't top-level resources.** A `work/section.resource.json` referenced only
  as a relation is intentionally not a menu entry; `visibility` should list only top-level resource
  dirs (what the loader scans), not relation sub-resource files, so the "add to menu" list isn't
  polluted with things that don't belong there.
