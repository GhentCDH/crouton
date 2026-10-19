# Layout

The optional `layout` key in `resource.json` lets you declare an explicit layout for the generated `form`, `view`, and `table` instead of the default source-order grid.

When `layout` is **absent**, the view is built exactly as before — one control per visible column in a 12-column `GridLayout`. Backward-compatible and additive: no `schemaVersion` bump, no migration needed.

## Shape

```json
{
  "layout": {
    "form": { ... },
    "view": { ... },
    "table": { ... }
  }
}
```

Each of `form`, `view`, and `table` is optional. Only the keys you declare are affected.

## Layout nodes

A **node** is a container. It has a `type` (the layout kind) and an `items` list whose entries are rendered in declared order.

```ts
{
  type?: "grid" | "vertical" | "horizontal" | "collapse" | "group",
  columns?: number,        // grid column count (default 12)
  title?: string,          // heading for collapse/group
  titleKey?: string,       // resolve heading from a field value at render time
  colspan?: number,        // this node's span inside its parent grid (1–12)
  rowspan?: number,        // CSS row-span of this node inside its parent grid
  label?: string,
  items?: [...]             // entries in declared order (see "Items" below)
}
```

A node with no `type` defaults to `"grid"`.

## Items

Every entry in an `items` array is one of four kinds, detected by its shape:

| Shape | Kind | Rendered as |
|---|---|---|
| `"fieldName"` (string) | **Field id** | The field's default renderer |
| `{ "id": "fieldName", ... }` | **Field control** (has `id`) | Field renderer with overrides |
| `{ "component": "MyComponent", ... }` | **Component** (has `component`) | Custom Vue component from `customComponents` |
| Any other object | **Nested node** | Recursive layout container |

Detection uses only the presence of `id` or `component` — not `type`, because field controls also have a `type` (input override, e.g. `"textarea"`).

**Order is preserved.** Items render exactly in the order declared — you can interleave fields, collapse sections, and components freely.

### Field control options

```ts
{
  "id": "fieldName",
  "colspan": 6,       // override column span (1–12)
  "rowspan": 2,       // override row span
  "width": "w-40",    // named size (xs/sm/md/lg/xl/full) or raw Tailwind class
  "label": "Custom label",
  "hideLabel": true,
  "type": "textarea", // override input type for this placement
  "options": { "minHeight": "8rem" }  // merged over fieldInput.options
}
```

### Component item options

```ts
{
  "component": "MyComponent",
  "colspan": 6,   // optional
  "label": "..."  // optional
}
```

Component references resolve by name from the app's `customComponents` registry (registered via `useCrouton()`).

## Examples

### Grid with colspan

```json
"form": {
  "type": "grid",
  "columns": 12,
  "items": [
    { "id": "label", "colspan": 3 },
    { "id": "title", "colspan": 9 },
    "description"
  ]
}
```

<LayoutDemo example="grid-colspan" />

### Collapse section

```json
"form": {
  "items": [
    "title",
    "body",
    {
      "type": "collapse",
      "title": "Metadata",
      "items": ["createdAt", "updatedAt"]
    }
  ]
}
```

<LayoutDemo example="collapse" />

### Group section (non-collapsible)

```json
"form": {
  "items": [
    {
      "type": "group",
      "title": "Author",
      "items": ["authorName", "authorEmail"]
    }
  ]
}
```

<LayoutDemo example="group" />

### Interleaved fields and sections

Because items render in declared order, you can mix fields and containers freely:

```json
"form": {
  "type": "grid",
  "columns": 12,
  "items": [
    { "id": "title", "colspan": 9 },
    { "id": "status", "colspan": 3 },
    {
      "type": "collapse",
      "title": "Advanced",
      "items": ["slug", "publishedAt"]
    },
    { "id": "body" }
  ]
}
```

The collapse renders between `status` and `body` — not at the end.

### Rowspan

```json
"form": {
  "type": "grid",
  "columns": 12,
  "items": [
    { "id": "body", "colspan": 6, "rowspan": 2 },
    { "id": "title", "colspan": 6 },
    { "id": "status", "colspan": 6 }
  ]
}
```

<LayoutDemo example="rowspan" />

### Control overrides

```json
"form": {
  "items": [
    { "id": "title", "label": "Custom Title Label", "colspan": 6 },
    { "id": "body", "options": { "minHeight": "6rem" } },
    { "id": "status", "hideLabel": true }
  ]
}
```

<LayoutDemo example="overrides" />

### Nested sections

```json
"form": {
  "type": "grid",
  "columns": 12,
  "items": [
    { "id": "title", "colspan": 6 },
    { "id": "status", "colspan": 6 },
    {
      "type": "collapse",
      "title": "Author details",
      "items": [
        {
          "type": "grid",
          "columns": 12,
          "items": [
            { "id": "authorName", "colspan": 6 },
            { "id": "authorEmail", "colspan": 6 }
          ]
        }
      ]
    }
  ]
}
```

<LayoutDemo example="nested" />

## Table layout (`layout.table`)

`layout.table` is either a **table node** (flat) or a **wrapper** containing exactly one table node somewhere in the tree.

### Table node

The table node carries all table-specific settings:

```json
"table": {
  "title": "Books",
  "items": [
    { "id": "title", "sortable": true, "defaultSort": true },
    { "id": "status", "sortable": true, "showWhen": { "field": "active", "eq": true } },
    { "id": "authorId", "type": "select", "options": { "values": [] } },
    "createdAt",
    "updatedAt"
  ],
  "searchFields": ["title", "isbn"],
  "filterFields": ["status"],
  "rowActions": [
    { "id": "approve", "label": "Approve", "type": "post" }
  ],
  "tableActions": [
    { "id": "exportCsv", "label": "Export CSV", "type": "post" }
  ]
}
```

| Field | Description |
|---|---|
| `items[]` | Column order + per-column overrides. Entries are field ids (strings) or field controls (objects with `id`). No nested nodes — the table is flat. |
| `searchFields` | Column ids included in `?q=` free-text search. |
| `filterFields` | Column ids that get a filter control in the toolbar. |
| `rowActions` | Per-record actions (receive the record id). |
| `tableActions` | Global toolbar actions (no record id). |
| `title` / `label` | Heading rendered above the table. `title` wins over `label`. |

#### Per-column table item options

| Field | Type | Description |
|---|---|---|
| `sortable` | boolean | Enable sort toggle on this column header. |
| `defaultSort` | `true` \| `"asc"` \| `"desc"` | Initial sort column and direction. `true` = `"asc"`. At most one column. |
| `width` | named (`"xs"` – `"xl"`) or CSS value | Column width. |
| `minWidth` / `maxWidth` | CSS value | Width constraints. |
| `align` | `"left"` \| `"center"` \| `"right"` | Cell text alignment. Number columns default to `"right"`. |
| `truncate` | `boolean` \| number | `true` = single-line ellipsis; number = max lines before clamp. |
| `pin` | `"left"` \| `"right"` | Sticky column. |
| `visible` | boolean | `false` = hidden by default (still in the schema; no column chooser yet). |
| `headerTooltip` | string | Tooltip text on the column header. |
| `showWhen` | `{ field, eq?, neq?, exists?, notExists? }` | Show column when condition matches. |
| `hideWhen` | Same shape | Hide column when condition matches. |
| `disabledWhen` | Same shape | Disable column when condition matches. |

`type` + `options` override the cell renderer for this column in the table only.

::: tip
`colspan`, `rowspan`, and `hideLabel` are form-layout options and have no effect on table items — they produce a validation error if set.
:::

#### Table node options

Beyond `items`, the table node accepts presentation options:

| Field | Type | Description |
|---|---|---|
| `pageSize` | number | Default page size (default `20`). Frontend hint; server still caps it. |
| `pageSizes` | number[] | Page size selector options (e.g. `[20, 50, 100]`). |
| `density` | `"normal"` \| `"compact"` | Row height. |
| `selectable` | boolean | Show row checkboxes for multi-select. |
| `rowClick` | `"view"` \| `"edit"` \| `"none"` | What happens when a row is clicked. |
| `emptyText` | string | Message shown when there are no rows. |

```json
"table": {
  "pageSize": 50,
  "pageSizes": [20, 50, 100],
  "density": "compact",
  "rowClick": "view",
  "emptyText": "No books yet",
  "items": [
    { "id": "title",       "sortable": true, "defaultSort": "desc", "width": "md", "truncate": 2 },
    { "id": "price",       "align": "right", "width": "xs" },
    { "id": "status",      "pin": "left" },
    { "id": "internalRef", "visible": false }
  ]
}
```

### Table column order

```json
"table": {
  "items": ["title", "status", "createdAt"]
}
```

Columns present in the table but not listed here are appended in their original order.

<LayoutDemo example="table-order" />

### Wrapper layout

A `layout.table` with an outer container type (not `"table"`) wraps the table. Put component items alongside the inner `{ "type": "table", ... }` node:

```json
"table": {
  "type": "grid",
  "columns": 12,
  "items": [
    { "component": "CreateByIsbn", "colspan": 12 },
    {
      "type": "table",
      "title": "Books",
      "items": ["title", "author", { "id": "isbn", "sortable": true }, "publishedYear", "status"],
      "searchFields": ["title", "isbn"],
      "filterFields": ["status"],
      "tableActions": [
        { "id": "searchOpenLibrary", "type": "link", "href": "https://openlibrary.org/search", "label": "Search Open Library" }
      ],
      "rowActions": [
        { "id": "openOnOpenLibrary", "type": "link", "href": "https://openlibrary.org/isbn/{isbn}", "label": "Open on Open Library", "condition": { "field": "isbn", "op": "exists" } }
      ]
    }
  ]
}
```

All table settings (`rowActions`, `tableActions`, `searchFields`, `filterFields`, `title`) go on the **table node**, not the wrapper.

Wrappers can nest arbitrarily:

```json
"table": {
  "type": "vertical",
  "items": [
    {
      "type": "horizontal",
      "items": [
        { "component": "CreateByIsbn" },
        { "component": "ImportCsv" }
      ]
    },
    {
      "type": "collapse",
      "title": "Stats",
      "items": [{ "component": "BookStats" }]
    },
    { "type": "table", "items": ["title", "author"] }
  ]
}
```

::: tip
Use the wrapper pattern when you need a custom action component alongside the table — for example a barcode scanner that creates a record directly. Each component receives a `resource` prop (the `UseResource` instance for the current table).
:::

## How a record opens (`layout.<form|view>.container`)

The `container` key on `layout.form` and `layout.view` controls how a record opens when a row is clicked.

```json
"layout": {
  "form": {
    "container": { "mode": "modal", "size": "xl" },
    "items": [...]
  },
  "view": {
    "container": { "mode": "page" }
  },
  "table": {
    "rowClick": "view",
    "items": [...]
  }
}
```

| Field | Values | Default | Description |
|---|---|---|---|
| `container.mode` | `"modal"` \| `"page"` | `"modal"` | How the record opens |
| `container.size` | `"xs"` \| `"sm"` \| `"lg"` \| `"xl"` | `"sm"` | Modal width (ignored for `"page"` mode) |

`layout.table.rowClick` decides **what** opens (`"view"`, `"edit"`, or `"none"`); the container decides **how**.

`view.component` replaces the whole detail view with a custom Vue component:

```json
"view": { "component": "BookDetail" }
```

::: tip Migration
The old root keys `display` and `modalSize` are removed. Run `crouton migrate` to move them automatically.
:::

## Missing / extra columns

- A control id that doesn't match a visible column → **skipped, dev warning logged**.
- Visible columns not referenced anywhere in the layout → **appended at the end, dev warning logged** (nothing silently disappears).

<LayoutDemo example="missing-extra" />

## Playground

Edit the layout JSON live and see the result update:

<LayoutDemo example="grid-colspan" />
