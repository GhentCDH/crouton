Status: planned

# Plan: make crouton development LLM-friendly

Date: 2026-10-09 · against `af3e074` (feat/llm-docs, 0.0.1-alpha.82)

Goal: an LLM agent working **inside the crouton repo** (not a consumer app) should be able to add a field input option, add a new field input type, or add a resource-level option correctly on the first try — touching every required file, missing nothing.

Related: `LLM_DOCS_PLAN.md` (consumer-facing). This plan is for contributors and LLM agents working on crouton itself.

Guiding principle: **the codebase should make omissions compile-time errors, not runtime surprises.** Where that's not possible, a checklist in `CLAUDE.md` and a generator script are the fallback.

---

## Findings: current touch-point map

### Adding an option to an existing field input (e.g. `autocomplete`)
**2–3 files. Low risk. Docs auto-generate.**

| File | What |
|------|------|
| `packages/crouton-core/src/lib/resource/field-input/types/<type>.options.ts` | Zod schema — add with `opt()` and `.meta({ description, examples })` |
| `packages/crouton-forms-vue/src/forms/renderers/controls/<Type>ControlRenderer.vue` | Vue renderer — read and apply the option |
| `packages/crouton-core/src/lib/view/table-schema.builder.ts` → `SHARED_CELL_OPTION_KEYS` | Only if option must pass through to table view |

`field-input-meta.spec.ts` will **fail** if you add a property without `opt()` — good.
Docs (`_generated/*.md`) regenerate on build — good. But **no CI drift check on generated docs** — they drift silently.

### Adding a new field input type (e.g. `rating`)
**7+ files across 3 packages. High risk. Two silent failure modes.**

| File | What |
|------|------|
| `packages/crouton-core/src/lib/resource/field-input/types/<type>.options.ts` | Create: zod options schema |
| `packages/crouton-core/src/lib/resource/field-input/registry.ts` | Register in `fieldInputRegistry` Map |
| `packages/crouton-core/src/lib/layout/control.builder.ts` → `ControlType` const | Add string literal |
| `packages/crouton-forms-vue/src/testers/tester.ts` | Add `is<Type>Control` predicate |
| `packages/crouton-forms-vue/src/forms/renderers/controls/<Type>ControlRenderer.vue` | Create Vue renderer |
| `packages/crouton-forms-vue/src/forms/renderers/controls/index.ts` → `controlRenderers` | Register `{ tester, renderer }` entry |
| `packages/crouton-editor-vue/src/canvas/type-swaps.ts` → `CANVAS_SUPPORTED_TYPES` | Add type string — **silent if omitted** (canvas marks column "unsupported") |
| `packages/crouton-codegen/src/naming.ts` → `fieldInputType` switch | Add Prisma type → fieldInput mapping (if applicable) |
| `docs/guide/2.resources/field-inputs/<type>.md` | Create hand-written page |
| `docs/guide/2.resources/field-inputs/index.md` | Add link |

**Silent failure 1:** `ControlType` (crouton-core) and tester predicates (crouton-forms-vue) both spell out the type name string. No compile-time check enforces they match. A typo in either = renderer never matches = silent blank control.

**Silent failure 2:** forgetting `CANVAS_SUPPORTED_TYPES` gives no error — the canvas just marks the column as "unsupported type" with no console warning.

### Adding a resource-level option (new top-level key in resource.json)
**4–6 files. Medium risk. Migration required if replacing an existing key.**

| File | What |
|------|------|
| `packages/crouton-core/src/lib/resource/ResourceJson.schema.ts` | Zod schema (`ResourceJsonShape`) |
| `packages/crouton-api/src/lib/crud/adapter/` relevant loader | Consume the option |
| `packages/crouton-codegen/src/draft.ts` or `classify.ts` | If codegen generates/preserves it |
| `packages/crouton-core/src/lib/resource/migrations/` | If replacing an old key — add migration + bump `CURRENT_RESOURCE_VERSION` |
| `docs/guide/2.resources/resource-json.md` | Hand-written — **no generation, no drift check** |

`resource.schema.json` has a CI drift check. The hand-written docs page does not.

### `form-schema.builder.ts` — the hidden switch
`buildFormControl` has explicit `if/else if` branches for `relation`, `autocomplete`, `date`, `date-range` to forward options into the uischema. The fallthrough `else` silently drops any options not explicitly passed. Adding a new type with custom option forwarding requires adding a branch here — easy to miss.

### Other gaps
- **Prisma type → fieldInput mapping** (`naming.ts:fieldInputType`) is a standalone switch. No test enumerates Prisma scalar types against it.
- **`crouton.schema.json` and `datasource.schema.json`** (added in LLM_DOCS_PLAN Phase 3) have no CI drift check yet.
- **No round-trip test** for `storeValue` (option that crosses 5+ layers: zod → uischema → renderer → composable → table).

---

## Phases

### Phase 1 — Checklists in CLAUDE.md + contributor AGENTS.md (S, do first)

Add a `# Development patterns` section to the repo `CLAUDE.md`:

```md
## Development patterns

### Adding an option to an existing field input
1. Edit `packages/crouton-core/src/lib/resource/field-input/types/<type>.options.ts` — add with `opt()` + `.meta({ description, examples })`.
2. Edit the Vue renderer in `packages/crouton-forms-vue/src/forms/renderers/controls/<Type>ControlRenderer.vue`.
3. If the option affects table display: add to `SHARED_CELL_OPTION_KEYS` in `table-schema.builder.ts`.
4. If the option affects the form uischema (like `withTime` on date): add a branch in `form-schema.builder.ts:buildFormControl`.
5. Run `pnpm nx run crouton-core:build` — regenerates `_generated/` docs and schemas.
6. Run `pnpm nx run crouton-core:test` — `field-input-meta.spec.ts` catches missing `.meta()`.

### Adding a new field input type
1. Create `packages/crouton-core/src/lib/resource/field-input/types/<type>.options.ts`.
2. Register in `packages/crouton-core/src/lib/resource/field-input/registry.ts`.
3. Add `<type>` to `ControlType` in `packages/crouton-core/src/lib/layout/control.builder.ts`.
4. Add tester predicate in `packages/crouton-forms-vue/src/testers/tester.ts`.
5. Create renderer in `packages/crouton-forms-vue/src/forms/renderers/controls/<Type>ControlRenderer.vue`.
6. Register renderer in `packages/crouton-forms-vue/src/forms/renderers/controls/index.ts`.
7. Add to `CANVAS_SUPPORTED_TYPES` in `packages/crouton-editor-vue/src/canvas/type-swaps.ts`.
8. Add Prisma type mapping in `packages/crouton-codegen/src/naming.ts:fieldInputType` (if applicable).
9. Create `docs/guide/2.resources/field-inputs/<type>.md` — hand-written page.
10. Add link in `docs/guide/2.resources/field-inputs/index.md`.

### Adding a resource-level option
1. Edit `ResourceJsonShape` in `packages/crouton-core/src/lib/resource/ResourceJson.schema.ts`.
2. Consume in the relevant API loader under `packages/crouton-api/src/lib/crud/adapter/`.
3. If codegen touches it: update `packages/crouton-codegen/src/draft.ts` / `classify.ts`.
4. If this replaces an existing key: add a migration in `packages/crouton-core/src/lib/resource/migrations/` and bump `CURRENT_RESOURCE_VERSION`.
5. Update `docs/guide/2.resources/resource-json.md` manually.
6. Run `pnpm nx run crouton-core:build` to update `resource.schema.json`.
```

Acceptance: an LLM reading CLAUDE.md can follow the checklist without reading the codebase.

---

### Phase 2 — Eliminate silent failures (M)

#### 2a. `ControlType` → tester sync check
`ControlType` is the canonical list; testers must cover every entry. Add a test in `crouton-forms-vue` that:
1. Imports `ControlType` values from `crouton-core`.
2. Asserts that for every value, a tester exists that matches a minimal uischema element with that type.

Failure = "you added `ControlType.rating` but forgot `isRatingControl`".

#### 2b. `CANVAS_SUPPORTED_TYPES` sync check
Add a test (or a `check-canvas-types.mjs` script) that compares `CANVAS_SUPPORTED_TYPES` against `fieldInputRegistry` keys. Fail if any registered type is missing from the canvas list.

#### 2c. `form-schema.builder.ts` branch coverage
Mark the `else` branch in `buildFormControl` with a `// ponytail:` comment:
```ts
// ponytail: options not listed above are dropped; add a branch if your type needs custom forwarding
```
Add a test: for each field input type in the registry that declares options beyond the shared ones, assert `buildFormControl` produces a uischema element that includes those options.

---

### Phase 3 — CI drift checks for generated files (S)

Add to `merge-request.yml` (or the existing drift-check step):

```yaml
- name: Check generated docs are committed
  run: |
    pnpm nx run crouton-core:build
    git diff --exit-code -- 'docs/guide/2.resources/field-inputs/_generated/'
    git diff --exit-code -- 'docs/.vuepress/public/schema/crouton.schema.json'
    git diff --exit-code -- 'docs/.vuepress/public/schema/datasource.schema.json'
```

Also add a `--ci` flag (or a separate target) to `gen-field-input-docs.mjs` that exits non-zero if the output differs from what's committed, mirroring how `gen-resource-schema.mjs` already works.

Acceptance: a PR that adds an option without committing the regenerated docs fails CI.

---

### Phase 4 — Prisma type → fieldInput mapping test (S)

`packages/crouton-codegen/src/naming.ts:fieldInputType` is a standalone switch with no test. Add `packages/crouton-codegen/src/naming.spec.ts`:

```ts
// Covers every Prisma scalar type from the DMMF type enum.
// Fails if a new Prisma type is added to crouton-prisma but not mapped in fieldInputType.
```

Import the Prisma DMMF type list (or hardcode the known scalars: `String`, `Int`, `BigInt`, `Float`, `Decimal`, `Boolean`, `DateTime`, `Json`, `Bytes`) and assert each returns a non-`undefined` fieldInput type.

---

### Phase 5 — `storeValue` round-trip test + option layer test (M)

The `storeValue` option crosses 5+ layers. Add one integration test in `crouton-api` or `crouton-forms-vue` that:
1. Builds a resource config with an autocomplete column + `storeValue: true`.
2. Submits a form value.
3. Asserts the stored value is a scalar (not an object).

More broadly: for every option in every field input type, add one test that asserts the rendered control actually reads the option. A snapshot test of the uischema produced by `buildFormControl` per type covers this cheaply.

---

### Phase 6 — `add-field-input` generator script (M)

`packages/crouton-core/scripts/scaffold-field-input.mjs <type>` (or an Nx generator):

1. Creates `packages/crouton-core/src/lib/resource/field-input/types/<type>.options.ts` from a template.
2. Adds the registry entry to `registry.ts`.
3. Adds `<type>` to `ControlType`.
4. Creates `packages/crouton-forms-vue/src/forms/renderers/controls/<Type>ControlRenderer.vue` stub.
5. Adds tester stub to `tester.ts`.
6. Adds renderer registration to `index.ts`.
7. Adds to `CANVAS_SUPPORTED_TYPES`.
8. Creates `docs/guide/2.resources/field-inputs/<type>.md` stub.
9. Adds link in `index.md`.
10. Prints: "Remaining manual steps: Prisma type mapping in naming.ts (if applicable), `form-schema.builder.ts` branch (if custom option forwarding needed)."

After running the script, the build compiles and no test fails — the developer only writes the actual implementation, not the plumbing.

---

## Order & sizing

| Phase | Size | Value |
|-------|------|-------|
| 1 CLAUDE.md checklists | S | Immediate — any LLM reading CLAUDE.md gets the full touch-point map |
| 2 Silent failure checks | M | High — catches the two most common omissions at CI time |
| 3 CI drift for generated docs | S | Medium — prevents docs drift without developer effort |
| 4 Prisma mapping test | S | Low — rarely breaks, but invisible when it does |
| 5 storeValue round-trip | M | Medium — prevents regressions in cross-layer options |
| 6 scaffold-field-input script | M | High — eliminates the 7-file footgun entirely |

Suggested order: 1 → 3 → 2 → 6 → 4 → 5.

## Open questions

1. Should `ControlType` be a union type derived from `fieldInputRegistry` keys (removing the duplication entirely) or stay as a separate const?
2. Should the `scaffold-field-input` script be an Nx generator or a plain `.mjs` script?
3. Should `form-schema.builder.ts` switch on the registry instead of `if/else if`, so new types are covered automatically?
