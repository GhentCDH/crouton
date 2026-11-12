# Task: Hide a field from the form of a resource that has a form layout

## Setup

You are working in a crouton project. `src/resources/book/resource.json` exists with columns `id`, `title`,
`summary` and `isbn`, and an explicit form layout:

```json
"layout": {
  "form": { "items": [{ "id": "title", "colspan": 8 }, { "id": "isbn", "colspan": 4 }, "summary"] }
}
```

## Your task

Update `src/resources/book/resource.json` so the create/edit form no longer shows `summary`. The table and detail
view must keep showing it.

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- When `layout.form` exists it is the full list for the form; `hiddenInForm` has no effect there
- Use the crouton skill if available
