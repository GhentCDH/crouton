Status: implemented
# Layout Section Plan (`layout` in `resource.json`)

## Goal

Let a resource declare an explicit **layout** for its generated views instead of the
current flat, source-order grid. Three keys — `form`, `view`, `table` — each optional.
When a key is **absent the view is built exactly as today** (`buildFormUiSchema` /
`buildTableUiSchema`), so this is fully backward compatible and additive
(no `schemaVersion` bump, no migration — same reasoning as the custom-kind work).

Target author-facing shape (from the request, extended):

```json
"layout": {
  "form": {
    "type": "grid",
    "columns": 12,
    "items": [
      {
        "controls": [
          { "id": "id", "width": "w-10", "colspan": 3 },
          "label"
        ]
      },
      { "controls": ["description"] },
      {
        "type": "collapse",
        "title": "Metadata",
        "items": [
          { "controls": ["createdAt", "updatedAt"] }
        ]
      }
    ]
  }
}
```

Decisions locked with Bo (2026-09-03):
- **Scope v1: all three views** (`form`, `view`, `table`).
- **`colspan` + `rowspan` both in v1.**
- **`width` allows raw class passthrough** (e.g. `"w-10"`) in addition to the named sizes.

---

## How the current pipeline works (context)

`resource.json` → `ResourceJsonSchema` (Zod, `resource/ResourceJson.schema.ts`) →
`json-adapter.ts` calls `buildViews(schema, cols)` (prisma) or
`buildViewsFromColumnTypes(cols)` (custom). Both delegate to **`buildViewsWithSource`**
(`view/view.builder.ts`), which builds each view via `buildView(..., buildUiSchema)`:

- `form`, `view`, `filter` use **`buildFormUiSchema`** → a `GridLayout` of one control per
  column, built with `LayoutBuilder` / `ControlBuilder` (`lib/layout/*`).
- `table` uses **`buildTableUiSchema`** → a flat `HorizontalLayout` of `TextCell`/`BooleanCell`
  (`lib/table/table.builder.ts`).

The UI-schema is served to the frontend (`payload-builders.ts`) and rendered by JSON Forms.
`LayoutRenderer.vue` maps `GridLayout` → `grid ... md:grid-cols-12` and reads
`child.options.colspan` via the `COLSPAN` map (`renderers/layout/colspan.ts`). `CollapseLayout`
already exists (`CollapseLayoutRenderer.vue`). **No `rowspan` support today.**

The important reuse point: **`buildFormControl(col)`** already resolves relations, autocompletes,
date/date-range, markdown, `showWhen/hideWhen`, labels, width, etc. The layout engine must
build controls **through the existing column config**, then apply per-placement overrides — it
must not re-implement control resolution.

---

## Design

### 1. Author-facing schema (`resource/Layout.schema.ts`, new)

A recursive **node** (a section/container) plus **control** entries.

```ts
// A control placed in the layout. String shorthand = column id with no overrides.
LayoutControlSchema =
  | z.string()
  | z.object({
      id: z.string(),                       // required — must match a column id
      colspan: z.number().int().min(1).max(12).optional(),
      rowspan: z.number().int().min(1).optional(),
      width: z.string().optional(),         // named size OR raw class (e.g. "w-10")
      label: z.string().optional(),
      hideLabel: z.boolean().optional(),
      type: z.string().optional(),          // override fieldInput.type/format for this placement
      options: z.record(z.string(), z.unknown()).optional(), // merged over fieldInput.options
    })

// A container. Has EITHER `controls` (leaves) OR `items` (nested nodes); may nest arbitrarily.
LayoutNodeSchema: z.ZodType = z.lazy(() =>
  z.object({
    type: z.enum(['grid', 'vertical', 'horizontal', 'collapse', 'group']).default('grid'),
    columns: z.number().int().min(1).max(12).optional(),   // grid column count (default 12)
    title: z.string().optional(),          // collapse/group heading
    titleKey: z.string().optional(),       // collapse/group heading resolved from a field value
    colspan: z.number().int().min(1).max(12).optional(),   // this node's span inside its parent grid
    rowspan: z.number().int().min(1).optional(),
    label: z.string().optional(),
    controls: z.array(LayoutControlSchema).optional(),
    items: z.array(LayoutNodeSchema).optional(),
  })
)

LayoutSchema = z.object({
  form: LayoutNodeSchema.optional(),
  view: LayoutNodeSchema.optional(),
  table: LayoutNodeSchema.optional(),
})
```

Add to `ResourceJsonShape` (`resource/ResourceJson.schema.ts`):
`layout: LayoutSchema.optional()`.

Notes:
- An **`item` with no `type`** defaults to `grid` — matches the request's example where each
  item is an implicit row/section holding `controls`.
- Sugar accepted by the loader: an item may carry `controls` **and** `items`; controls render
  first, then nested items.
- **Schema-gen caveat:** `scripts/gen-resource-schema.mjs` runs `z.toJSONSchema(ResourceJsonShape)`.
  Recursive `z.lazy` + `z.record` has a known Zod-v4 `toJSONSchema` crash in this repo
  (see `zodSchemaSource`'s try/catch). Verify `pnpm` schema-gen still succeeds after adding
  `layout`; if it throws, give `LayoutNodeSchema` an explicit `$id`/manual JSON-Schema fragment
  in the generator rather than letting it recurse.

### 2. Layout → UI-schema translator (`view/layout-ui-schema.builder.ts`, new)

`buildFormUiSchemaFromLayout(node, cols)` — mirrors `buildFormUiSchema` but walks the node tree:

- Build a `Map<id, JsonColumn>` from `cols` (the already-visible, context-resolved columns for
  that view — same input `buildFormUiSchema` gets).
- Recurse:
  - `grid`   → `LayoutBuilder.grid(node.columns)`
  - `vertical` → `LayoutBuilder.vertical()`
  - `horizontal` → `LayoutBuilder.horizontal()`
  - `collapse` → `LayoutBuilder.collapse().title(node.title).titleKey(node.titleKey)`
  - `group`  → titled, non-collapsible section (new `GroupLayout` type; renderer below)
  - Apply `node.colspan` / `node.rowspan` / `node.label` to the container builder so a nested
    section spans columns/rows in its parent grid.
- For each control: look up the column, **call the existing `buildFormControl(col)`** to get a
  fully-resolved `ControlBuilder`, then apply overrides:
  `.colspan()`, `.rowspan()` (new), `.width()` (raw-class aware), `.label()`, `.hideLabel()`,
  and for `type`/`options` re-run `.control(type, mergedOptions)` over the resolved options
  (merge `control.options` from `buildFormControl` with the placement `options`, one level deep,
  reusing `mergeFieldVariant` semantics).
- **Missing / unknown ids:**
  - A control `id` that isn't a visible column → **skip + collect a dev warning** (don't crash).
  - Columns visible in the view but **not referenced anywhere in the layout** → append them in a
    trailing `grid` section so nothing silently disappears, and warn. (Keeps "if nothing defined
    it works as is" honest even for partial layouts.)

`view` uses the same translator (same JSON-Forms grid pipeline, rendered read-only via
`ReadOnlyLayoutRenderer.vue`).

**Table** (`view/layout-table-order.ts`, new): the table is a flat cell list, **not** a CSS grid,
so for `layout.table` v1 we honor **column order + grouping only**:
- Flatten the node tree depth-first into an ordered list of control ids.
- Reorder `buildTableUiSchema`'s output elements (and the `columns` array) to match; unreferenced
  visible columns keep their relative order at the end.
- `colspan`/`rowspan`/`width` on table controls are ignored (dev warning if present).
- **Grouping** (a section `title` → a spanning column-group header) is noted as a **follow-up**,
  not v1 — the current `ResourceTable`/`TableBuilder` has no column-group concept.

### 3. Wire into `view.builder.ts`

Thread the resource's `layout` through without changing `buildView`'s shape — pass per-view
builder factories:

```ts
buildViewsWithSource(source, columns, layout?)   // add optional `layout`
```

- form: `const buildForm = layout?.form ? (cols) => buildFormUiSchemaFromLayout(layout.form, cols) : buildFormUiSchema;`
- view: same with `layout.view`.
- table: build with `buildTableUiSchema` as today, then if `layout.table`, post-process with
  `orderTableColumnsFromLayout(view, layout.table)`.

Propagate the param through `buildViews`, `buildViewsFromColumnTypes`, and the call sites in
`json-adapter.ts` (pass `json.layout`). `buildViewsFromColumns` (sub-resources) can ignore it in
v1 (documented limitation) or accept it later.

### 4. Core builder additions (`lib/layout`, `lib/table`)

- `layout.options.ts`: add `rowspan?: number` to `CroutonElementOptions`; add
  `GroupLayout: 'GroupLayout'` to `LayoutType`.
- `base.builder.ts`: add `rowspan(n)` helper (mirrors `colspan`).
- `control.builder.ts`: extend `width()` — if the value is one of the named sizes
  (`xs|sm|md|lg|xl|full`) keep current `input-{size}` behavior; otherwise treat it as a **raw
  class** and set `styles.control.wrapper` (and a passthrough `styles.width`) to that string.
  Verify `renderers/controls/composables/useInput.ts` (line ~109 reads `styles?.width`) consumes
  it correctly.
- `layout.builder.ts`: add a `LayoutBuilder.group()` static (or reuse `collapse` with a flag).

### 5. Frontend renderer changes (`crouton-forms-vue`)

- `renderers/layout/colspan.ts`: add a `ROWSPAN` map (`1..N → row-span-1..row-span-N`, plus the
  read-only variant if needed). Tailwind must have these classes available (safelist or static
  presence — check the forms-vue tailwind config; add a safelist entry for `row-span-*` and
  `col-span-*` if purge would drop them).
- `LayoutRenderer.vue`: on the child wrapper add `ROWSPAN[child.options?.rowspan]`; add
  `grid-auto-rows: minmax(0,auto)` (via a `grid-flow-row-dense` / `auto-rows-min` class) to the
  `GridLayout` container so row spanning is meaningful.
- `CollapseLayoutRenderer.vue`: apply `ROWSPAN` on children too (it already applies `COLSPAN`).
- `ReadOnlyLayoutRenderer.vue`: same rowspan handling for the `view`.
- New `GroupLayoutRenderer.vue` (titled, non-collapsible `div` with a heading + inner grid) and
  register it in `LayoutRenderers.ts` / `readonlyLayoutRenderers` with `uiTypeIs('GroupLayout')`.

### 6. Docs & schema

- Regenerate `resource.schema.json` (schema-gen script) and confirm editor autocomplete for the
  new `layout` key.
- Document the `layout` section in `docs/` with the grid + nested-section + collapse examples.

---

## Testing / verification

Core (vitest — note crouton-core's vitest config gap called out in `custom_resource_kind.md`;
ensure the new specs actually run):
- Translator unit tests: flat grid, nested sections, `collapse`/`group`, control overrides
  (`colspan`/`rowspan`/`width`/`type`/`options`/`hideLabel`), string-shorthand controls,
  unknown id (skipped + warned), unreferenced column (appended).
- Snapshot: **no `layout`** produces byte-identical `ui_schema` to `buildFormUiSchema` today
  (regression guard for backward compat).
- Table ordering test; ignored colspan warning.
- Relation/date/autocomplete column placed via layout still resolves correctly (proves reuse of
  `buildFormControl`).

Frontend:
- Render a form with `colspan`/`rowspan` and a `collapse` + `group` section; visual check that
  grid spanning works and read-only `view` matches.

Full pipeline: run one real resource end-to-end through `json-adapter` and confirm the served
payload.

---

## Rollout / sequencing

1. Schema (`Layout.schema.ts` + `ResourceJsonShape`) + schema-gen verify.
2. Core builder additions (`rowspan`, raw `width`, `group`).
3. Translator + table ordering + `view.builder` wiring + `json-adapter`.
4. Core tests (incl. backward-compat snapshot).
5. Frontend renderers (rowspan, group, safelist).
6. Docs + regenerate schema JSON.

Steps 1–4 are backend-only and independently shippable; the form/view still renders correctly
before step 5 as long as authors only use `colspan`/`collapse` (already supported) — `rowspan`
and `group` need step 5 to render.

## Open questions

- **Strict vs lenient** unreferenced columns: append-at-end + warn (proposed) vs require every
  visible column to appear? Append is safer while iterating.
- **Table grouping** (section title → spanning header): defer to v2 — confirm that's fine.
- Sub-resource forms (`buildViewsFromColumns`): out of scope for v1?
