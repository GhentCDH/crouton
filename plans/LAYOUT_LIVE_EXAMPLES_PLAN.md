Status: planned
# Layout — Live Examples & Verification Plan

## Verification result (2026-10-06)

**Core + renderers are built, but `layout` never reaches the served payload.**

| Piece | Status |
|---|---|
| `Layout.schema.ts` + `layout` in `ResourceJsonShape` + `resource.schema.json` | ✅ |
| `buildFormUiSchemaFromLayout`, `orderTableColumnsFromLayout`, `buildViewsWithSource(…, layout)` | ✅ |
| Core builders: `rowspan`, raw-class `width`, `LayoutBuilder.group()` | ✅ |
| Renderers: `ROWSPAN`, `GroupLayoutRenderer` (edit + read-only), `grid-flow-row-dense` | ✅ |
| Unit tests `layout-ui-schema.builder.spec.ts` | ✅ 12/12 pass |
| **`json-adapter.ts:90` → `buildViews(schema, enrichedColumns)`** | ❌ no `json.layout` passed |
| **`compile-resource.ts:68` → same** | ❌ no `json.layout` passed |

So in a real app, any `layout` in `resource.json` is validated and then ignored.

### Bugs / doc mismatches found

1. **Not wired** (above) — the blocker.
2. **`options`-only override resets the input type to `text`** —
   `applyControlOverrides` calls `base.control(ctrl.type ?? 'text', ctrl.options)`.
   A control with `{ "id": "body", "options": { "minHeight": "8rem" } }` on a markdown
   column becomes a text input. Fix: keep the resolved `format` when `type` is absent.
3. **`options` not merged over `fieldInput.options`** (doc says "merged") — it's a shallow
   spread onto the control options, so nested objects (e.g. `styles`) are replaced, not
   merged. Use `mergeFieldVariant`-style one-level-deep merge.
4. **"dev warning"** — warnings use `console.warn` unconditionally (also in prod). Either
   gate on dev mode or reword the docs.
5. **Table span warning** — doc says spans are ignored; code has empty `if` blocks
   (no warning). Add the warning or drop the empty branches.
6. **`ROWSPAN` max 6** — schema allows any `rowspan ≥ 1`. Cap schema at 6 or extend map.
7. **Unreferenced columns** are appended to the *root* node directly (not a trailing
   grid section as the original plan said). Fine for a grid root; inside a `vertical`/
   `horizontal` root they inherit that flow. Doc is accurate enough — just confirm intent.
8. **No end-to-end test** proving a `resource.json` with `layout` produces the layout in
   the compiled views.

---

## Plan

### Step 1 — Wire it up (crouton-core / crouton-api)

- `compile-resource.ts`: `buildViews(schema, enrichedColumns, json.layout)`.
- `json-adapter.ts`: same. Check the custom-kind / `buildViewsFromColumnTypes` path and
  pass `json.layout` there too.
- Test: `compile-resource.spec.ts` — resource.json with `layout.form` (collapse + group),
  `layout.table` order → assert `views.form.ui_schema` shape and `views.table.columns` order.
- Test: no `layout` → views byte-identical to before (regression guard).

### Step 2 — Fix override bugs (crouton-core)

- `applyControlOverrides`: preserve resolved format when `type` absent; deep-merge
  `options` (one level) over resolved options.
- Table: emit the span-ignored warning (or remove dead branches).
- Align `rowspan` schema max with `ROWSPAN` map.
- Decide on dev-only warnings; update code or docs.
- Add spec cases for each.

### Step 3 — Live demo component (docs)

New `docs/.vuepress/components/LayoutDemo.vue` (register in `client.ts`), following the
`AutoSaveFormDemo` / `ResourceJsonEditorDemo` pattern:

- Props: `example` (key of a preset) — presets defined in
  `docs/.vuepress/components/layout-examples.ts`, one per doc example.
- Each preset: a small fixed column set (e.g. `id, label, description, title, body,
  status, authorName, authorEmail, createdAt, updatedAt`) + a `layout` object.
- Runs the **real** pipeline client-side: `buildViewsFromColumnTypes(columns, layout)` from
  `@ghentcdh/crouton-core` (browser-safe, already aliased in `config.js`). No backend.
- Tabs: **Form** (`CroutonForm`/JSON Forms with edit renderers) · **View** (read-only
  renderers) · **Table** (column header order) · **JSON** (editable `layout` textarea;
  re-builds on change, shows Zod errors from `LayoutSchema.safeParse`) · **UI schema**
  (generated output, collapsible).
- Captures `warn` callback output and lists it under the demo — makes the
  missing/extra-column behaviour visible.
- Wrap in `<ClientOnly>`.

Props follow repo style: runtime object syntax in `LayoutDemo.properties.ts`, arrow fns.

### Step 4 — Wire demos into `docs/guide/resource/layout.md`

Under each existing example add `<LayoutDemo example="…" />`:

| Doc section | preset key | Shows |
|---|---|---|
| Grid with colspan | `grid-colspan` | 3/9 split + full-width row |
| Collapse section | `collapse` | collapsible Metadata |
| Group section | `group` | titled non-collapsible block |
| Table column order | `table-order` | reordered headers + appended cols |
| Missing / extra columns | `missing-extra` | warnings panel |
| (new) Rowspan | `rowspan` | textarea spanning 2 rows next to 2 inputs |
| (new) Control overrides | `overrides` | `width`, `label`, `hideLabel`, `type`, `options` |
| (new) Nested sections | `nested` | grid → collapse → grid with `colspan` on node |

Plus a "Playground" at the bottom: same component with the editable JSON tab open.

### Step 5 — Visual verification

- `pnpm nx run docs:serve`, open each demo, check:
  - colspan 3/9 renders side-by-side at md+, stacks on narrow.
  - rowspan 2 actually spans (needs ≥2 sibling rows) — Tailwind picks up `row-span-*`
    (they're static strings in `colspan.ts`, covered by `@source`).
  - Group/Collapse titles; `titleKey` resolves from data.
  - View tab = read-only renderers with same structure.
  - Table headers in declared order.
- Optional: Playwright smoke test on the docs page (see `PLAYWRIGHT_TESTING_PLAN.md`).

### Step 6 — Example app

Add a `layout` block to one resource in `examples/book-collection` so the full
API → frontend path is exercised against a real backend.

### Step 7 — Docs touch-ups

- Fix wording per Step 2 decisions (warnings, options merge, rowspan max).
- Add `rowspan` and nested-section examples.
- Note limitations: sub-resources (`buildViewsFromColumns`) ignore `layout`; table
  grouping headers not supported.

## Order

1 → 2 (core, shippable) → 3 → 4 → 5 → 6 → 7. Steps 3–4 can start in parallel with 1–2
since the demo calls the core builder directly, but bugs from Step 2 will show up in the
`overrides` demo until fixed.

## Open questions

- Dev-only warnings vs always-on?
- Rowspan: cap at 6 or extend map to 12?
- Should unreferenced columns go into a trailing `grid` section (original plan) instead of
  the root container?
