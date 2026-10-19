# Task: Configure table column display options

## Setup

You are working in a crouton project. `src/resources/book/resource.json` exists with a table layout that already lists columns `title`, `price`, `publishedAt`, `isbn`, and `genre`.

## Your task

Update the `layout.table` in `src/resources/book/resource.json` so that:

1. `title` is sortable and truncates at 2 lines
2. `price` is right-aligned with width `"xs"` and sortable
3. `publishedAt` has `defaultSort: "desc"` (newest first)
4. `isbn` is pinned to the left
5. `genre` is hidden by default (`visible: false`)
6. The table shows 50 rows per page with options `[20, 50, 100]`

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

Check visually that:
- The price column is right-aligned
- The title column shows a 2-line clamp for long values
- The genre column is absent from the initial table view

## Hints

- Table item options go inside the item object: `{ "id": "price", "align": "right", "width": "xs", "sortable": true }`
- `defaultSort` can be `true`, `"asc"`, or `"desc"`
- `pageSize` and `pageSizes` go on the table node (alongside `items`), not on individual items
- Use the crouton skill if available
