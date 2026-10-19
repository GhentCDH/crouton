# Task: Open the detail view as a page, edit form as a large modal

## Setup

You are working in a crouton project. `src/resources/book/resource.json` exists. Currently records open in a default small modal for both view and edit.

## Your task

Update `src/resources/book/resource.json` so that:

1. Clicking a row opens the **view** as a full page (not a modal)
2. The **create/edit form** opens in a large (`xl`) modal
3. Clicking a row in the table opens the view (set `rowClick: "view"` on the table node)

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- `layout.view.container.mode: "page"` opens the detail view as a page
- `layout.form.container.mode: "modal"` + `layout.form.container.size: "xl"` sets the form container
- `rowClick` goes on the table node (in `layout.table`)
- `display` and `modalSize` at root are removed — use `layout.<form|view>.container`
- Use the crouton skill if available
