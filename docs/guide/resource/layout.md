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

A **node** is a container that holds either `controls` (leaf fields) or `items` (nested nodes), or both.

```ts
{
  type?: "grid" | "vertical" | "horizontal" | "collapse" | "group",
  columns?: number,        // grid column count (default 12)
  title?: string,          // heading for collapse/group
  titleKey?: string,       // resolve heading from a field value at render time
  colspan?: number,        // this node's span inside its parent grid (1–12)
  rowspan?: number,        // CSS row-span of this node inside its parent grid
  label?: string,
  controls?: [...],
  items?: [...]
}
```

A node with no `type` defaults to `"grid"`.

## Controls

A control entry is either a plain column id string or an object with overrides:

```ts
// Shorthand — uses column defaults
"fieldName"

// With overrides
{
  "id": "fieldName",
  "colspan": 6,      // override column span (1–12)
  "rowspan": 2,      // override row span
  "width": "w-40",   // named size (xs/sm/md/lg/xl/full) or raw Tailwind class
  "label": "Custom label",
  "hideLabel": true,
  "type": "textarea",              // override input type for this placement
  "options": { "minHeight": "8rem" }  // merged over fieldInput.options
}
```

## Examples

### Grid with colspan

```json
"form": {
  "type": "grid",
  "columns": 12,
  "controls": [
    { "id": "id", "colspan": 3 },
    { "id": "label", "colspan": 9 },
    "description"
  ]
}
```

### Collapse section

```json
"form": {
  "controls": ["title", "body"],
  "items": [
    {
      "type": "collapse",
      "title": "Metadata",
      "controls": ["createdAt", "updatedAt"]
    }
  ]
}
```

### Group section (non-collapsible)

```json
"form": {
  "items": [
    {
      "type": "group",
      "title": "Author",
      "controls": ["authorName", "authorEmail"]
    }
  ]
}
```

### Table column order

```json
"table": {
  "controls": ["title", "status", "createdAt"]
}
```

Columns present in the table but not listed here are appended at the end in their original order. `colspan`/`rowspan` on table controls are ignored (tables are flat, not CSS grids).

## Missing / extra columns

- A control id that doesn't match a visible column → **skipped, dev warning logged**.
- Visible columns not referenced anywhere in the layout → **appended at the end, dev warning logged** (nothing silently disappears).
