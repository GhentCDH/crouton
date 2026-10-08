# Task: Fix a validation error in resource.json

## Setup

You are working in a crouton project. `src/resources/book/resource.json` exists and contains a typo:

```json
{
  "$schema": "https://ghentcdh.github.io/crouton/schema/v1/resource.schema.json",
  "schemaVersion": 1,
  "name": "book",
  "model": "Book",
  "title": "Books",
  "columns": {
    "id": { "idField": true, "hiddenInForm": true },
    "title": { "searchable": true },
    "summary": {
      "fieldInput": { "type": "autocompleet" }
    }
  }
}
```

Running `crouton validate` reports an error about an unknown fieldInput type `"autocompleet"`.

## Your task

Fix the typo in `src/resources/book/resource.json` so that `crouton validate` exits 0.

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- Use the crouton skill if available
- Read `node_modules/@ghentcdh/crouton-core/agent-docs/README.md` for docs
- `crouton validate` outputs a "Did you mean" hint that tells you the correct type
- The correct fieldInput type for a multi-line text field is `textarea`
