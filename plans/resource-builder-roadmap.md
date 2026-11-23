# Resource builder — roadmap

Goal: a complete `resource.json` buildable from **either** a UI builder **or** a chat, both
producing the same patches. Phase 1 (control builder) is in `control-builder.md` (#644).

## Phases

| # | Phase | Scope | Why this order |
|---|---|---|---|
| 1 | Control builder | one column + translations | foundation: descriptors, patches, chat providers |
| 2 | **Table layout builder** | `layout.table` (flat table node) | a flat ordered list: simplest layout, high value |
| 3 | Form layout builder | `layout.form` tree (grid, tabs, collapse, …) | needs a tree editor + grid canvas |
| 4 | View layout builder | `layout.view` | reuses phase 3 + "copy from form" |
| 5 | Resource settings | name, route, title, kind, source, operations, security, sidebar, lookup, parent | schema-driven, reuses the phase 1 descriptor walker |
| 6 | Resource composer | whole resource: columns list + all builders + chat across sections | glue + multi-step chat |

Follow-ups after 6: table wrapper layouts, custom control types, custom layout components,
reading/writing files via the dev endpoint, relations/sub-resources.

## Cross-cutting (decide in phase 1 so later phases don't rework it)

- **One patch model for the whole resource.** Phase 1's `ColumnPatch` becomes a scoped
  `ResourcePatch` (`path` relative to the resource root, e.g. `columns.name.fieldInput.options.width`).
  Layout phases add tree ops: `insertNode`, `moveItem`, `wrap`, `unwrap`, `removeNode`, `setNodeProp`.
- **One descriptor walker** for every Zod schema (column, options, table node, layout node, resource root).
- **One validation path**: always `ResourceJsonSchema` incl. its existing `superRefine` layout rules
  (unknown column ids, table-only keys in the wrong place, `custom` without `component`).
- **Chat = router + section providers.** The router picks the section (column / table / form /
  resource) and the provider gets a **small, scoped context**. That matters for Gemini Nano's
  limited context window: never send the whole resource.
- Every builder stays **dumb**: props in (the resource or a slice of it), patches out.

## Phase 2 — Table layout builder

Input: `columns` (read-only, for the palette) + `layout.table`. Output: table patches.

UI
- **Column palette**: all columns not yet in the table; drag them in or click to add.
- **Ordered list** of table items (drag to reorder). Per item:
  - plain id ↔ expanded field control (`LayoutTableFieldControlSchema`: align, width, …),
    edited with the phase 1 descriptor form (cell variant, so no colspan/rowspan/hideLabel)
  - component cell (`TableItemSchema` component variant)
- **Table settings** (descriptor form over `TableNodeSchema`): title, defaultSort (select from
  the placed columns), pageSize/pageSizes, density, selectable, rowClick, emptyText, download,
  search/filter fields.
- **Actions**: `rowActions` / `tableActions` lists (descriptor form over `JsonActionSchema`).
- **Preview**: real table with mock rows generated from the column types.

Chat examples
- "show name, birthdate and nationality, sorted by name descending"
- "compact rows, 50 per page, csv download"
- "make birthdate right-aligned" / "verwijder kolom id uit de tabel"

## Phase 3 — Form layout builder

Input: `columns` + `layout.form`. Output: form patches incl. tree ops.

Node types (from `FormLayoutNodeSchema`): `grid`, `vertical`, `horizontal`, `collapse`,
`group`, `tabs`, `custom`.

UI
- **Outline tree** (left): nodes + fields, drag to move, context menu: *wrap in grid / tabs /
  collapse*, *unwrap*, *delete*.
- **Canvas** (center), per node type:
  - **grid**: choose `columns` (1–12) with a stepper/slider; the canvas shows the real grid.
    Every child shows its `colspan` (and `rowspan`) and has a **resize handle**: drag right to
    take more cells, down for more rows. Presets: *full width*, *half*, *third*. Warn when a row
    overflows the column count.
  - **tabs**: one tab per child node; add/rename/reorder tabs (`title`); each tab body is a node
    of its own (default: grid) so "grid with 2 tabs inside, each tab a 2-column grid" works.
  - **collapse / group**: label/title + nested canvas.
  - **vertical / horizontal**: simple stack with drop zones.
  - **custom**: `component` name + `props` JSON (no preview, placeholder box).
- **Inspector** (right): node props via the descriptor form; when a field is selected, the
  phase 1 control builder opens for that column (layout field overrides vs column options are shown
  separately).
- **Palette**: unplaced columns; badge "not in form" so nothing is lost silently.
- `container` (modal/page + size) in the form settings.
- **Preview**: live form through crouton-forms-vue with the real ui-schema builder.

Chat examples
- "a grid with 2 columns, inside tabs General and Details"
- "put birthdate and deathdate next to each other, name full width"
- "move nationality to the Details tab" / "zet adres in een inklapbare sectie"
- "open as a page instead of a modal"

## Phase 4 — View layout builder

Same tree editor and canvas as phase 3 plus `container.component`. Extra action: **copy from form**
(then diverge). Mostly config, little new code.

## Phase 5 — Resource settings

Descriptor form over the resource root (`ResourceJsonShape`): name, route, title, kind,
`source` (model, dbTable, datasource, idType), operations, security, sidebar, lookup, parent.
Chat: "resource Author at /authors, only admins can delete, show in sidebar group Persons".

## Phase 6 — Resource composer

- Shell combining: resource settings · columns list (add/remove/reorder → phase 1 builder) ·
  table · form · view, with one JSON pane and one validation panel for the whole resource.
- **Multi-step chat**: "create a resource Author with name (required), birthdate, nationality
  autocomplete from /api/countries; table shows name and nationality; form in 2 tabs" → the
  router splits it into section intents, produces one combined patch set, shown as **one reviewable
  diff** per section, applied together.
- Starting points: empty, from a Prisma model (codegen already maps types → field inputs), or
  from an existing resource.json pasted in.
- Undo/redo over patch history.

## Docs per phase

Each phase adds a page under `docs/guide/5.tooling/` with a live demo and a generated chat-phrase
cheat-sheet, picked up by `llms.txt`, plus drift tests so new schema keys are understood by the chat.
