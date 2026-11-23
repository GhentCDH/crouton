# Migration Guide — 0.1.0 → 0.2.0

Hand this file to an AI assistant from the root of an existing crouton app:

```
Read migrate-to-0.2.0.md and apply every applicable step to this repository.
Run each "Detect" command first; skip a step when it finds nothing.
At the end, print a short report: step → applied / skipped / needs manual review.
```

No `resource.json` changes are required — every `resource.json` valid on 0.1.0 is valid on 0.2.0.
Coming from a `0.0.1-alpha.x` release? Do [Step 0](#step-0--coming-from-an-alpha) first.
The breaking changes are in **runtime behaviour of hooks**, **filter handling**, the **generated Prisma
client workspace layout**, and a few **frontend renderer details**.

Placeholders below: `<name>` = the npm scope used for generated packages (see
`@<name>/generated-default-types` in an app `package.json`), `<prefix>` = the folder that holds `apps/` and
`generated/` (empty for single-project workspaces), `<ds>` = datasource name (`default` unless you added more).

---

## Step 0 — Coming from an alpha

Apps still on `0.0.1-alpha.x` (the `alpha` dist-tag) upgrade without install errors, but their resource files use
pre-0.1.0 shapes and fail validation: no CRUD routes get mapped, and the cause only shows in
`/crouton/status.json` (e.g. `'model' moved to source.model (run crouton migrate)`).

**Detect**: `grep -rln '"model"\|"display"' --include=resource.json . | grep -v node_modules`

**Fix**: after Step 1, run `pnpm crouton migrate --yes` (per project: `--project <prefix>`), then
`pnpm crouton validate`. Fix by hand whatever either reports.

---

## Step 1 — Update packages

All crouton packages are released in lockstep.

```bash
pnpm up "@ghentcdh/crouton-*@0.2.0-rc.0" "@ghentcdh/create-crouton@0.2.0-rc.0"
```

Packages no longer publish under the `alpha` dist-tag. Replace any `@alpha` / `alpha` range in `package.json`
with an explicit version.

- **CLI not installed?** `pnpm up` only updates packages you already have. Apps that depend only on
  `@ghentcdh/create-crouton` need the CLI for the later steps: `pnpm add -D -w @ghentcdh/crouton-cli@0.2.0-rc.0`.
- **`"*"` ranges in workspace libs** (e.g. `"@ghentcdh/crouton-api": "*"` in a shared lib's
  `peerDependencies`) keep resolving to the old version, which gives two crouton copies and TS2742 errors
  (*inferred type cannot be named without a reference to …/node_modules/@ghentcdh/crouton-api*). Pin them too.

**Detect**: `grep -rn '"@ghentcdh/crouton-[a-z-]*": "\*"' --include=package.json . | grep -v node_modules`

---

## Step 2 — `beforeWrite` now runs on delete (breaking)

`beforeWrite(data, ctx)` is now called before **every delete** (resource, sub-resource, custom repository),
with `data === undefined` and `ctx.op === 'delete'`. It can throw to block the delete. Its return value is
ignored on delete.

A hook that reads `data` unguarded now crashes every delete with a 500.

**Detect**

```bash
grep -rln "beforeWrite" --include=hooks.ts --include='*.hooks.ts' . | grep -v node_modules
```

**Fix** — in every `beforeWrite`, return early for delete unless you want to guard it:

```ts
// before
beforeWrite: async (data, ctx) => ({ ...data, updatedBy: ctx.request.user.email }),

// after
beforeWrite: async (data, ctx) => {
  if (ctx.op === 'delete') return data;            // or: throw new ForbiddenException() to block
  return { ...data, updatedBy: ctx.request.user.email };
},
```

Code that switches on `ctx.op` and has a `default:` branch must handle `'delete'` explicitly.
If a hook previously relied on "delete is never checked", add the access check here — this is now the
place to block deletes.

---

## Step 3 — Sub-resource list hooks now run (behaviour change)

`GET /<parent>/:id/<child>` now runs the child's `beforeFindAll` and `afterFindAll` hooks (from
`hooks/<child>.ts` or the child dir's `hooks.ts`), the same as a top-level list. Before 0.2.0 they were
skipped.

**Detect**

```bash
grep -rln "beforeFindAll\|afterFindAll" --include='*.ts' . | grep -v node_modules | grep hooks
```

**Fix** — for each sub-resource hook file found, check that `beforeFindAll` / `afterFindAll`:

- do not assume `ctx.parent` is undefined (it is now set for sub-resource lists), and
- do not add a filter that duplicates the parent FK the framework already applies.

No change is needed if the hooks are only meant for top-level lists **and** are correct for nested lists too.

If you worked around the skipped hooks by copying `beforeFindAll` logic into a custom repository's
`findAllByParent`, remove that copy — the hook now runs before `findAllByParent`, so the logic would run twice.

---

## Step 4 — Broken `hooks.ts` takes the resource offline (behaviour change)

If a `hooks.ts` (resource or sub-resource) throws on import, the resource is **no longer served** (it was
served without hooks before — failing open). A failing sub-resource hooks file also takes the parent down.
The failure is listed on the status page / resource load errors.

**Detect** — start the backend and check the log / status page for
`Failed to import hooks — resource not served`.

**Fix** — fix the import error. Nothing to change if all hooks load.

---

## Step 5 — Filter values are coerced; bad values return 400 (behaviour change)

List filters (`?filter=field:value:operator`) on `boolean`, `integer` and `number` fields are converted to
the field type:

| Before                                        | After                                  |
|-----------------------------------------------|----------------------------------------|
| `active:true:equals` → 500 from Prisma        | works (`true`)                          |
| `active:yes:equals`                           | **400** `must be true or false`         |
| `year:abc:equals`                             | **400** `must be a number`              |
| `year:2020` (default `contains`) on Int       | treated as `equals`                     |
| `year:2020:not_contains` on Int               | treated as `not_equals`                 |

Filter allowlist (`operations.findAll.filter`) is now checked against the **client's** filters only;
filters added by `beforeFindAll` are trusted and no longer need to be in the allowlist.

**Detect** — frontend or API clients that build filter strings by hand:

```bash
grep -rn ":contains\|:equals\|filter=" --include='*.ts' --include='*.vue' apps libs 2>/dev/null | grep -v node_modules
```

**Fix** — send `true`/`false` and numeric strings for non-text fields. If you added fields to
`operations.findAll.filter` only so a `beforeFindAll` hook could filter on them, you may remove them
(optional; tightens the public API).

---

## Step 6 — Generated Prisma client is no longer a workspace package (scaffolded Nx apps)

Prisma rewrites the generated client's `package.json` on every `prisma generate`, which invalidated the
pnpm lockfile (CI needed `--no-frozen-lockfile` and stub packages). From 0.2.0 the client is resolved through
the existing `tsconfig.base.json` path alias only.

**Detect**

```bash
grep -rn "generated-.*-client\": \"workspace" --include=package.json . | grep -v node_modules
```

Skip this step when nothing is found.

**Several crouton projects in one workspace?** Repeat every item below per `<prefix>`: each app
`package.json`, each `'!<prefix>/generated/*/client'` exclusion, each committed `types/package.json` and each
Dockerfile.

**Fix** — apply in this order (removing the dependency before excluding the folder, otherwise
`pnpm install` fails on an unresolvable `workspace:*`):

1. **Every app `package.json`** — remove `"@<name>/generated-<ds>-client": "workspace:*"`. Add
   `"@prisma/client-runtime-utils": "^7.0.0"` next to `@prisma/client` in the backend app and in the root
   `package.json`.
2. **`pnpm-workspace.yaml`** — after the `generated/**` glob add an exclusion:
   ```yaml
   packages:
     - <prefix>/apps/*
     - <prefix>/generated/**
     - '!<prefix>/generated/*/client'
   ```
   (no prefix: `- '!generated/*/client'`).
3. **`.gitignore`** — replace the bare `generated` line with:
   ```gitignore
   **/generated/*/client/
   **/generated/*/types/*
   !**/generated/*/types/package.json
   ```
   then commit `<prefix>/generated/<ds>/types/package.json` (`git add -f` if it was ignored).
4. **Delete** `<prefix>/generated/<ds>/client/package.json` if it is tracked in git (`git rm --cached`).
5. **CI** (`.github/workflows/ci.yml`) — replace the `install-command` stub block with:
   ```yaml
   install-command: |
     pnpm install --frozen-lockfile
     DATABASE_URL=postgresql://ci:ci@localhost:5432/ci pnpm crouton generate --yes
   ```
   (keep `--project <prefix>` if it was there). `crouton generate` (cli ≥ 0.2.0) only runs `prisma generate`;
   don't use `crouton update resources --skip-pull` here — it still rewrites resources, translations and agent files.
6. **Dockerfiles**
   - Dev / frontend Dockerfile: `COPY --parents … generated/*/package.json` →
     `COPY --parents … generated/*/types/package.json`.
   - Prod Dockerfile, deps stage: delete the `RUN mkdir -p …/client … echo '{"name":…}'` stub block; copy
     `generated/*/types/package.json` alongside `apps/*/package.json`; install with `--frozen-lockfile`.
   - Prod Dockerfile, build stage: delete the `sed -i 's/"name": "prisma-client-…` line and the
     `RUN pnpm install --no-frozen-lockfile` re-link after `prisma generate`.
   - Prod Dockerfile, runtime stage: add next to the existing `generated/client` copy:
     ```dockerfile
     COPY --from=build /app/<prefix>/generated/<ds>/client ./node_modules/@<name>/generated-<ds>-client
     ```
7. **`.dockerignore`** — if it ignores `generated`, re-include the types `package.json`, otherwise the new
   `COPY` lines fail:
   ```
   **/generated/*/client
   **/generated/*/types/*
   !**/generated/*/types/package.json
   ```
8. **Hand-written CI** (no `install-command` stub block): add a generate step after install and before
   `build` — the generated client and types are no longer in the repo or the lockfile.
9. Run `pnpm install` and commit the updated `pnpm-lock.yaml`.

On `0.2.0-rc.0`, generated zod types imported the bare `@prisma/client`, which the path alias doesn't cover
(`Cannot find module '.prisma/client/default'`). Fixed after rc.0: re-run `prisma generate` and drop any symlink
or `sed` workaround for it.

Reference: a freshly scaffolded project (`pnpm create @ghentcdh/crouton`) shows the target layout.

---

## Step 7 — `schema.prisma`: `zodOutput` → `output` (optional)

The `crouton-prisma` generator now takes Prisma's standard `output`. `zodOutput` still works.

**Rename** the key, keeping its value — don't just delete `zodOutput`. Without either key the generator falls back
to `./generated/types` relative to the schema folder (`prisma/<ds>/generated/types`), and imports of the
generated types break without an error.

```prisma
generator crouton {
  provider = "crouton-prisma"
  output   = "../../generated/default/src"   // was: zodOutput = "…"
}
```

**Detect**: `grep -rn "zodOutput" --include=schema.prisma .`

---

## Step 8 — CLI: `--database` → `--datasource` (deprecation)

`crouton create resource --database <name>` is now `--datasource <name>` (`-d` unchanged). The old flag is a
hidden alias. Update scripts / docs that pass `--database`.

**Detect**: `grep -rn "\-\-database" --include='*.json' --include='*.sh' --include='*.md' --include='*.yml' . | grep -v node_modules`

---

## Step 9 — Frontend form behaviour (`@ghentcdh/crouton-vue`)

Only relevant if you have **custom renderers, custom tests, or code that reads form values**.

| Change | Impact | Action |
|---|---|---|
| Cleared values in API-backed forms are `null` (date, dateRange, select, toggle, number, autocomplete). Non-API forms keep `undefined`. | Server now receives `null` on autosave PATCH and clears the column. | Custom `beforeWrite` hooks / validation that treat `null` as "not sent" must handle it. |
| `select` and `multiSelect` renderer rank 11 → **13**. | A custom renderer registered for `format: 'select'` / `'multiSelect'` at rank ≤ 13 is no longer picked. | Raise the custom renderer's rank to ≥ 14. |
| `multiSelect` stores a real array when the schema type is `array`; only string columns still get a JSON string. | Code that `JSON.parse`s a multiSelect value from a `Json`/array column breaks. | Accept arrays. |
| `dateRange` stores an object when the schema type is `object`; string columns still get JSON. | Same as above. | Accept objects. |
| Validation messages: unknown issues fall back to zod's message instead of the bare code; new messages for number min/max, integer, format/pattern. | Snapshot / text assertions on error messages. | Update expected strings. |
| `aria-label` on lib inputs is now the **label**, not the field id. `SelectWrapper` no longer renders `role="select"`. Control wrappers carry `data-control-id="<id>"`. | Playwright selectors `getByRole(…, { name: '<fieldId>' })` and `[role="select"]` stop matching. | Select by visible label (`getByRole('textbox', { name: 'Title' })`) or scope by id: `page.locator('[data-control-id="title"]').getByRole('textbox')`. |
| Inline `options` on select / multiSelect / autocomplete no longer require an `HttpClient`. | none | — |
| Layout `component` items receive props `data`, `readonly`, `schema`, `uischema`, plus static `props` from `resource.json`. | A custom component declaring a prop with one of these names gets a new value. | Rename the conflicting prop. |
| Sidebar leaf has `route` (API mount point); `useCrouton().routeOf(id)` added; `getFormDefById(name)` resolves via route. | Resources where `route` ≠ `name` now load correctly. | Remove any app workaround that mapped name → route. |
| Admin header title goes through i18n key `admin.title` (`'{title} Admin'`). | Custom translations can override it. | Optional. |

**Detect**

```bash
grep -rn "rankWith(1[0-3], .*[Ss]elect\|role=\"select\"\|\[role=select\]\|getByRole(.*name: *'[a-z][A-Za-z]*'" \
  --include='*.ts' --include='*.vue' apps libs 2>/dev/null | grep -v node_modules
```

---

## Step 10 — New, opt-in features (no action needed)

- `fieldInput.errorMessage` (all field inputs) — replace the validation text.
- `fieldInput.clearable` on `string` inputs.
- `relation.displayKey` on a relation column (column-level `displayKey` still wins).
- `props` on layout `component` items.
- `normalize-schema.json` renames accept `{ "to": "…", "relationOnly": true }`.
- `crouton update resources` auto-renames relation fields that collide with a scalar column
  (`revisionStatus` → `revisionStatusRef`) and recovers from an invalid `schema.prisma` with
  `db pull --force` (previous `.bak` kept). Check the log for renamed fields and update any code that used
  the old relation field name.
- Per-operation `security` is now kept in resource definitions (was dropped).
- manyToOne relation on its own FK column (`authorId`) shows the related record in tables.

---

## Step 11 — Verify

```bash
pnpm install --frozen-lockfile
pnpm crouton generate --yes
pnpm nx run-many -t lint typecheck build
```

Then run `pnpm crouton validate` — it must report 0 issues.

Start the backend and confirm: no `resource not served` errors (check `/crouton/status.json` too: load errors are
listed there, not always in the log), a delete works, a list with a boolean filter
works, and a nested `/<parent>/:id/<child>` list returns rows.
