# Book Collection — E2E Tests

Playwright tests for the book-collection example app. Tests cover the full Crouton feature set: pagination, search, create, update, autocomplete, many-to-many relations, enums, unique constraints, nullable dates, delete, and visual snapshots.

## Commands

All commands run from the workspace root.

| Command | Description |
|---|---|
| `pnpm nx run book-collection-e2e:e2e` | Full run (headless, resets DB, CI-safe) |
| `pnpm nx run book-collection-e2e:e2e:ui` | Full run with Playwright UI (resets DB) |
| `pnpm nx run book-collection-e2e:e2e:dev:ui` | UI mode against already-running servers |
| `pnpm nx run book-collection-e2e:e2e:dev` | Headless against already-running servers |

## Dev workflow (live editing)

Start servers in separate terminals, then run tests:

```bash
# terminal 1
pnpm nx run book-collection-backend:serve

# terminal 2
pnpm nx run book-collection-frontend:serve

# terminal 3 — pick one
pnpm nx run book-collection-e2e:e2e:dev:ui   # interactive UI
pnpm nx run book-collection-e2e:e2e:dev      # headless
```

The dev configs reuse existing servers (`reuseExistingServer: true`) and skip the DB reset, so you see live backend/frontend logs and changes reload without restarting the test runner.

## DB setup

The full `e2e` and `e2e:ui` targets reset the database before every run via `book-collection-backend:db:e2e-setup`, which:

1. Deletes `apps/backend/prisma/dev.db`
2. Runs `prisma generate`
3. Runs `prisma migrate deploy`
4. Seeds 3 authors, 4 categories, 30 books, 5 users, 10 loans

The dev targets skip this step — the backend uses its in-memory seed on startup.

## Updating visual snapshots

```bash
pnpm nx run book-collection-e2e:e2e -- --update-snapshots
```
