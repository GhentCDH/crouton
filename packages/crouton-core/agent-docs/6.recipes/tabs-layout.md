---
description: Split a long form or detail view into tabs with the built-in "tabs" layout node — no custom component needed.
---

# Tabs layout

Use this when a form or detail view gets too long for one screen. `"type": "tabs"` is built in: no Vue component, no
registration — only `resource.json`.

## Steps

### 1. Group the fields per tab

Each child of the `tabs` node becomes one tab. Wrap the fields of a tab in a `group` and give it a `title`; that
title is the tab label. Need columns inside a tab? Nest a `grid` in the group.

```json
"layout": {
  "form": {
    "items": [
      {
        "type": "tabs",
        "items": [
          {
            "type": "group",
            "title": "General",
            "items": [
              {
                "type": "grid",
                "columns": 12,
                "items": [
                  { "id": "title", "colspan": 8 },
                  { "id": "isbn", "colspan": 4 },
                  { "id": "authorId", "colspan": 6 },
                  { "id": "publishedYear", "colspan": 6 },
                  { "id": "summary", "colspan": 12 }
                ]
              }
            ]
          },
          {
            "type": "group",
            "title": "Collection",
            "items": ["status", "availability", "isSigned", "provenance"]
          },
          {
            "type": "group",
            "title": "Categories",
            "items": ["categories"]
          }
        ]
      }
    ]
  }
}
```

This renders three tabs — **General**, **Collection**, **Categories** — inside one form with a single Save.

### 2. Reuse it in the detail view

The same node works in `layout.view`. Custom components can be a tab too, e.g. a list of related records:

```json
"view": {
  "items": [
    {
      "type": "tabs",
      "props": { "syncQuery": "tab" },
      "items": [
        { "type": "group", "title": "General", "items": ["title", "isbn", "author", "publishedYear"] },
        { "type": "group", "title": "Summary", "items": ["summary"] },
        { "type": "group", "title": "Loans", "items": [{ "component": "LoanList" }] }
      ]
    }
  ]
}
```

`"props": { "syncQuery": "tab" }` keeps the active tab in the URL (`?tab=2`), so a reload or shared link opens the
same tab. Omit it to always start on the first tab.

### 3. (Optional) Label a tab from the record

Set `titleKey` to a field name to use that field's value as the tab label; `title` is the fallback when the value is
empty (e.g. on create).

```json
{ "type": "group", "title": "General", "titleKey": "title", "items": ["title", "isbn"] }
```

The tab shows the book's title, or **General** for a new book.

Titles are translated like any other layout title — see [translations](../4.frontend/translations.md).

## Notes

- All tabs belong to one form: inactive tabs stay mounted and are validated on Save.
- A tab with an invalid field shows an error badge, so users can find the error on a hidden tab.
- Arrow keys, Home and End move between tabs.
- Fields placed inside a tab count as placed — they are not appended again at the end of the form.
- Only `group`, `collapse`, `horizontal` and `custom` children carry a `title`; a bare `grid` / `vertical` child gets "Tab 1", "Tab 2", ….
- `tabs` works in `layout.form` and `layout.view`, not in `layout.table`.
- Want a different look? Register your own component under the name `Tabs` — see the
  [custom layout recipe](./custom-layout.md).
