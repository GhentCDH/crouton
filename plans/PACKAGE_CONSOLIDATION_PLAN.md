# Package Consolidation Plan

## Goal

Shrink the published surface from 8 packages to **4**:

- `@ghentcdh/crouton-core`
- `@ghentcdh/crouton-vue`
- `@ghentcdh/crouton-api`
- `@ghentcdh/create-crouton`

Everything else becomes internal (never published):

- `crouton-forms-vue` → bundled into `crouton-vue`, marked private
- `crouton-editor-vue` → bundled into `crouton-vue`, marked private
- `crouton-codegen` → already private (build/dev tooling), no change
- `add-crouton` → folded into `create-crouton`, package removed

**Open decision (blocks the CLI part, not the Vue part):** `crouton-cli` is the
per-project dev CLI (`crouton update|create-resource|create-datasource|translations`)
and is installed as a devDependency into scaffolded backends. It cannot simply
disappear. See "Open Decisions" below.

---

## Why the Vue merge needs real work

`crouton-vue` today **externalizes** `crouton-forms-vue` and `crouton-editor-vue`
(they are in its rolldown `external` list and declared as `peerDependencies`).
A published `crouton-vue` therefore expects the consumer to install forms/editor
from npm. The moment those go private, every `crouton-vue` consumer breaks.

The fix is to flip `crouton-vue` from *externalizing* to *bundling* forms/editor,
and to re-export their full public API (today `crouton-vue` only surfaces a
fraction of it).

---

## Phase 1 — Bundle forms + editor into crouton-vue

### 1.1 Build config — `packages/crouton-vue/vite.config.ts`
- Remove `@ghentcdh/crouton-editor-vue` and `@ghentcdh/crouton-forms-vue` from
  the `rolldownOptions.external` array so they are inlined into the dist bundle.
- Keep `@ghentcdh/ui`, `vue`, `zod`, `@jsonforms/core`, `axios`, `vee-validate`,
  `vue-router`, `lodash-es` external (still real peer deps).
- Ensure the dts step inlines forms/editor types (they currently re-export
  crouton-core "to support rollupTypes"). Enable rolled-up types so the emitted
  `index.d.ts` does not reference the now-private packages.

### 1.2 CSS
- `crouton-forms-vue` and `crouton-editor-vue` each ship their own `styles.css`
  and import it from their `index.ts`. Once bundled, confirm those styles land in
  `crouton-vue`'s emitted `styles.css` asset (verification step 6.3).

### 1.3 package.json — `packages/crouton-vue/package.json`
- Move `@ghentcdh/crouton-forms-vue` and `@ghentcdh/crouton-editor-vue` from
  `peerDependencies` to `dependencies` (workspace refs, now bundled).
- Leave the genuine peers (`@ghentcdh/ui`, `vue`, `zod`, `@jsonforms/core`,
  `axios`, `vue-router`) as peers.

### 1.4 Re-export the full surface — `packages/crouton-vue/src/index.ts`
Today crouton-vue only re-exports `TableComponent`, `CroutonForm`, and `./relation`.
Consumers currently import much more directly from forms-vue/editor-vue:
- From forms-vue: `FormComponent`/`JsonForm`, `JsonFormModal`/`FormModal`,
  `AutoSaveForm`, `useAutoSave`, `useFormLogic`, `useFormEvents`,
  `provideHttpClient`/`useHttpClient`, `repository`, `table`, renderers,
  `formatError`/`registerZodErrorMap`, plus its crouton-core re-exports.
- From editor-vue: `ResourceJsonEditor` (+ its 3 other exports).

Add `export * from '@ghentcdh/crouton-forms-vue';` and the editor exports (or a
curated allow-list). Decide whether editor exports go on the root barrel or a
`crouton-vue/editor` subpath (see Open Decisions — editor is dev-only).
- Preserve forms-vue's `./testing` subpath if anything consumes it: either
  re-expose as `crouton-vue/testing` or confirm it is unused.

### 1.5 Mark forms + editor private
For **both** `crouton-forms-vue` and `crouton-editor-vue`:
- `packages/*/package.json`: add `"private": true`, remove `publishConfig`.
- `nx.json` `release.projects`: remove `crouton-forms-vue` and
  `crouton-editor-vue` from the list.

---

## Phase 2 — Repoint internal + scaffold references

- `packages/create-crouton/src/lib/deps.ts` (line ~14): frontend `deps` currently
  installs `@ghentcdh/crouton-vue`, `@ghentcdh/crouton-forms-vue`,
  `@ghentcdh/crouton-editor-vue`. Reduce to just `@ghentcdh/crouton-vue`.
- `docs/.vuepress/components/ResourceJsonEditorDemo.vue`: imports
  `ResourceJsonEditor` from `@ghentcdh/crouton-editor-vue` → import from
  `@ghentcdh/crouton-vue` (matching whatever subpath 1.4 chooses).
- Grep the repo for any other direct consumer imports of the two packages
  (outside the packages themselves and `.claude/worktrees`) and repoint.
- `CLAUDE.md`: update the "Package Boundaries" section to describe the new
  layout (forms/editor internal to crouton-vue).

---

## Phase 3 — Fold add-crouton into create-crouton

`add-crouton` is 701 LOC in 2 files and its `runner.ts` already imports its whole
implementation from `@ghentcdh/create-crouton/lib`. It is a thin CLI wrapper for
"add crouton to an existing project."

- Move `add-crouton`'s CLI entry into `create-crouton` as an `add` mode
  (subcommand, or auto-detect an existing project) using the shared `./lib`.
- Delete the `add-crouton` package directory.
- `nx.json` `release.projects`: remove `@ghentcdh/add-crouton`.
- Remove the dead/stub `add` command in `crouton-cli` (`src/commands/add.ts`,
  action is commented out and not wired into `index.ts`) to avoid two notions of
  "add".
- Update README / docs that reference the `add-crouton` binary.

---

## Phase 4 — crouton-cli decision (see Open Decisions)

Resolve the crouton-cli question, then either leave it published (5th package) or
fold its commands into `create-crouton` and update `deps.ts` line 10.

---

## Phase 5 — Verification

1. `pnpm nx run-many -t build` — all remaining packages build.
2. `pnpm nx run-many -t typecheck` and `-t lint` clean.
3. Inspect `packages/crouton-vue/dist/index.d.ts` — no references to
   `@ghentcdh/crouton-forms-vue` / `crouton-editor-vue` (types are inlined).
4. Confirm `crouton-vue/dist/styles.css` contains forms + editor styles.
5. Dry-run publish / `npm pack` crouton-vue in a scratch dir; import
   `FormComponent`, `AutoSaveForm`, `ResourceJsonEditor`, `useAutoSave` from
   `@ghentcdh/crouton-vue` and confirm they resolve with forms/editor NOT installed.
6. Run `create-crouton` end-to-end in a temp dir; confirm the scaffolded frontend
   installs only `crouton-vue` and its app compiles.
7. Confirm `nx release --dry-run` plans to publish exactly the 4 (or 5) intended
   packages and nothing private.

---

## Open Decisions

1. **crouton-cli** — keep as a 5th published package (it is a genuine per-project
   dev tool with a different lifecycle than the `npm create` bootstrap), or fold
   its four commands into `create-crouton` as subcommands? Folding is a larger
   change and affects scaffolded-project devDeps.
2. **editor-vue placement** — the visual builder is dev-only (needs backend
   `CROUTON_SCHEMA_EDITOR`). Put its exports on the root `crouton-vue` barrel
   (simplest) or on a `crouton-vue/editor` subpath (keeps ~2.3k LOC of editor UI
   out of prod bundles for consumers who never import it)?
3. **forms-vue `./testing` subpath** — confirm whether it is consumed externally;
   if so, re-expose via crouton-vue, otherwise drop.

---

## Suggested sequencing

Phase 1 + 2 (the Vue merge) is self-contained and delivers most of the win — ship
it first. Phase 3 (add-crouton) is small and independent. Phase 4 (crouton-cli)
waits on the Open Decision. Do them as separate commits/PRs.

---

## Phase 6 — Deprecate the retired packages on npm

Marking a package `private` in the repo only stops *future* publishes. The
versions already on npm stay installable, so `npm deprecate` is the separate
runtime signal that steers consumers to the replacement. It is non-destructive
(old lockfiles keep resolving) — unlike `npm unpublish`, which for a scoped
public package is restricted and breaks anyone pinned to an old version.

**Order:** publish the consolidated `crouton-vue` / `create-crouton` FIRST (so
the replacement exists on npm), then run the deprecations.

This is a manual one-off, run *outside* the `nx release` pipeline (nx release
publishes; it does not deprecate). Requires being an owner/maintainer of the
`@ghentcdh` scope; add `--otp=<code>` if 2FA is enabled.

```bash
npm login

# forms + editor → now bundled inside crouton-vue
npm deprecate "@ghentcdh/crouton-forms-vue@*" \
  "Merged into @ghentcdh/crouton-vue. Install @ghentcdh/crouton-vue instead."

npm deprecate "@ghentcdh/crouton-editor-vue@*" \
  "Merged into @ghentcdh/crouton-vue. Install @ghentcdh/crouton-vue instead."

# add-crouton → folded into create-crouton
npm deprecate "@ghentcdh/add-crouton@*" \
  "Merged into @ghentcdh/create-crouton. Use \`npm create @ghentcdh/crouton\` (add mode)."
```

Notes:
- `@*` deprecates every published version regardless of tag (these are
  `alpha`-tagged `0.0.1-alpha.x`).
- Undo with an empty message: `npm deprecate "@ghentcdh/crouton-forms-vue@*" ""`.
- If `crouton-cli` is folded into `create-crouton` (Open Decision 1), deprecate it
  the same way; if it stays published, leave it.
