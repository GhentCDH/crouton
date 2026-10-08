# Live `resource.json` Validation in the Docs — Plan

## Goal

Add a docs page where a user can paste a `resource.json` and validate it **on the fly**, using the **exact same validation the crouton API runs** — no divergent copy of the rules, no backend call.

## What "the same validation as the API" actually is

The API validates a `resource.json` in one place:

- `packages/crouton-api/src/lib/crud/resource/ReadResourceJson.ts` → `JSON.parse(file)` then
  ```ts
  buildResourceJsonSchema().safeParse(fileContent)
  ```
- `packages/crouton-core/src/lib/compile/parse-schema.ts` (`parseSchema`) does the identical
  `buildResourceJsonSchema().safeParse(...)` before compiling.

So the authoritative check is the single Zod schema factory **`buildResourceJsonSchema()`** in
`packages/crouton-core/src/lib/resource/ResourceJson.schema.ts`. It includes:

- the full `ResourceJsonShape` object schema (all field types/defaults),
- `.superRefine(refineByKind)` — the per-`kind` rules (custom vs prisma: `model`, `parent`,
  `calculatedColumns`, per-column `type`, …),
- registered **extensions** (via `getResourceExtensions()`),
- a `.transform()` that fills defaults and lifts extension keys.

This is the primitive to reuse. It is critical that the docs page calls **this function**, not a
hand-rolled schema — that is what guarantees parity.

### Why this is achievable fully client-side

- `crouton-core` is browser-safe by design (no `fs`/`child_process`; per `CLAUDE.md`).
- The docs Vite config **already aliases** `@ghentcdh/crouton-core` to the package source
  (`docs/.vuepress/config.*`), and the existing `ResourceJsonEditorDemo.vue` already imports from
  the crouton packages. So `import { buildResourceJsonSchema } from '@ghentcdh/crouton-core'` works
  in a VuePress client component with zero new wiring.

## Scope — three layers, only one is real parity

| Layer | What it is | In scope? |
|-------|-----------|-----------|
| **1. Zod parse** — `buildResourceJsonSchema().safeParse()` | Exactly what `ReadResourceJson` runs. Pure, browser-safe. | **Yes — the deliverable.** Byte-for-byte parity with the API. |
| 2. Compile — `parseSchema()` / `compileResource()` | Runs *after* the parse. For `kind:"prisma"` it needs the sibling `schema.ts` default export, which a pasted JSON doesn't carry. | Optional / out of scope. Note the limitation; don't fake a `schema.ts`. |
| 3. Structural — `validateResourceConfig()` (api) | Post-compile checks; `validateCustomRepository` inspects a `repository.ts` **on disk**. fs-bound. | Out of scope — can't run in the browser. Mention it as "checked at load time on the server". |

Decision: **implement Layer 1** and label it as the API-parity check. Optionally surface a couple
of Layer-2/3 rules as advisory notes, but do not claim they run.

## Also: run migrations first (dev-loader parity)

The dev loader upgrades a raw file to `CURRENT_RESOURCE_VERSION` before parsing via
`runResourceMigrations` (`crouton-core/src/lib/resource/migrations`). Today `CURRENT === BASELINE ===
1`, so it's a no-op — but calling it first future-proofs the page and mirrors the loader. Wrap in
try/catch and show `MigrationPathError` / `MigrationStepError` as a distinct message.

## One clarification to call out on the page: the published JSON Schema is NOT the same check

`packages/crouton-core/scripts/gen-resource-schema.mjs` publishes
`/schema/v1/resource.schema.json` (referenced by files' `$schema` for editor autocomplete). It is
generated with `z.toJSONSchema(ResourceJsonShape, { io: 'input', unrepresentable: 'any' })` — i.e.
**without `refineByKind`** and degrading unrepresentable bits to `{}`. It is therefore **more
permissive** than the runtime check.

The page must make this explicit: the live validator (Zod) is the authoritative one the API uses;
the `$schema` JSON Schema is a looser editor aid. This is the single most likely point of user
confusion, so it earns a callout box.

## Implementation steps

1. **New client component** `docs/.vuepress/components/ResourceJsonValidator.vue`
   - `<textarea>` bound to a ref, seeded with a valid example (reuse the `book` resource from
     `ResourceJsonEditorDemo.vue`).
   - Validate live (debounced `watch`) and/or on a "Validate" button.
   - Pipeline: `JSON.parse` → (optional) `runResourceMigrations` → `buildResourceJsonSchema().safeParse`.
   - Three result states: **invalid JSON** (parse error + line/col if available), **schema errors**
     (list of issues), **valid** (green, show the normalized/transformed output from
     `result.data` — this demonstrates applied defaults, which is a nice teaching moment).
   - All client-side; no network. Matches the "no backend call" tone of the existing editor doc.

2. **Error rendering helper**
   - `safeParse` failure gives a `ZodError`. The API only does `error.message` (ugly). For docs,
     iterate `error.issues` and render `path.join('.') || '(root)'` + `message` + `code` in a table
     or list. Optionally group by top-level key. Consider `z.treeifyError`/`z.prettifyError` (Zod 4)
     for a compact view — confirm the installed Zod major first.

3. **New doc page** `docs/guide/resource/validate-resource-json.md`
   - Intro: what it validates and that it's the same `buildResourceJsonSchema()` the API loads with
     (link to `resource-json.md` and `resource-json-editor.md`).
   - `<ResourceJsonValidator />`.
   - The callout: Zod (authoritative) vs published `$schema` JSON Schema (looser autocomplete aid).
   - Short note on what is *not* covered here (compile needs `schema.ts`; `repository.ts` existence
     and other structural checks run server-side at load).

4. **Register the component** in `docs/.vuepress/client.ts`
   - Import + `app.component('ResourceJsonValidator', ResourceJsonValidator)` alongside the two
     existing demos.

5. **Sidebar** — add the page to `docs/guide/typedoc_sidebar.json` under the resource group, next
   to `resource-json-editor`.

6. **Examples** — ship 2–3 canned inputs the user can load with a click: one valid, one with a
   `kind:"custom"` + `model` violation (hits `refineByKind`), one with a bad column type. Good for
   demonstrating real error output.

## Code conventions (from `CLAUDE.md`)

- Arrow functions only (`const validate = () => {…}`).
- If any new Vue component needs props, use runtime object syntax in a separate
  `*.properties.ts` file. (The validator likely needs none — it's self-contained.)

## Edge cases / gotchas

- **Extensions**: `buildResourceJsonSchema()` reads the global extension registry. The docs build
  won't have app extensions registered, so the page validates the **core** shape — state that, or
  optionally expose a toggle to register a sample extension.
- **`transform` output**: show `result.data` so users see defaults applied (e.g. `tag:"Crouton"`,
  `display`, `route` derived from `name`) — but label it "normalized result", not "your input".
- **Zod version**: confirm Zod 4 (`z.toJSONSchema` in the gen script implies v4) before using
  `z.prettifyError`/`treeifyError`.
- **Large paste / perf**: debounce live validation (~200ms) so typing stays smooth.

## Testing / verification

- `pnpm nx run docs:serve`, open the new page, confirm: valid input → green + normalized output;
  the `custom`+`model` example → the exact `refineByKind` message; malformed JSON → parse error.
- Cross-check one failing case against the API: same input through `readResourceJson` should produce
  the same issue (the message text will differ in presentation only, since both come from the same
  `ZodError`).
- `pnpm nx run docs:build` succeeds (component resolves through the existing alias).
- Optional: a small vitest for the error-formatting helper (pure function).

## Files touched

- `docs/.vuepress/components/ResourceJsonValidator.vue` *(new)*
- `docs/guide/resource/validate-resource-json.md` *(new)*
- `docs/.vuepress/client.ts` *(register component)*
- `docs/guide/typedoc_sidebar.json` *(sidebar entry)*
- *(no changes to `crouton-core` or `crouton-api` — the plan deliberately reuses the exported
  `buildResourceJsonSchema` unchanged.)*

## Suggested commit message

```
docs(resource): add live resource.json validator page

Reuse buildResourceJsonSchema() from @ghentcdh/crouton-core — the same Zod
validation ReadResourceJson runs — in a client-side VuePress component, so
users can validate a resource.json in the browser with full API parity.

- new ResourceJsonValidator.vue (JSON.parse -> migrations -> safeParse, no backend)
- new guide/resource/validate-resource-json.md with example inputs
- register component in client.ts, add sidebar entry
- callout clarifying the Zod check is authoritative vs the looser published
  $schema JSON Schema (editor autocomplete only)
```
