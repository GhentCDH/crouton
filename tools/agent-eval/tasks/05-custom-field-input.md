# Task: Register and use a custom field input component

## Setup

You are working in a crouton project. `src/resources/book/resource.json` exists and has a `rating` column (type integer). A Vue component `StarRating` exists at `src/components/StarRating.vue`.

The project has a crouton config file (e.g. `src/crouton.config.ts` or similar) where custom field inputs can be registered.

## Your task

1. Register the `StarRating` component as a custom field input in the crouton config, using the key `"star-rating"`.
2. Edit `src/resources/book/resource.json` so the `rating` column uses `fieldInput: { "type": "star-rating" }`.

## Verification

After completing, run: `crouton validate`
Expected: exits 0 with no issues.

## Hints

- Use the crouton skill if available
- Read `node_modules/@ghentcdh/crouton-core/agent-docs/README.md` for docs
- Custom field inputs are registered via the crouton plugin's `fieldInputs` option
- The `type` string in `resource.json` must exactly match the registered key
- Example registration:
  ```ts
  crouton({
    fieldInputs: {
      'star-rating': StarRating,
    },
  })
  ```
