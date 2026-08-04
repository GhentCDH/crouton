# Visual resource builder

A dev-only UI for editing `resource.json` files and generating them from your database, without hand-editing JSON or
running the CLI. It's built on the same engine as `crouton update resources` (see [CLI](./cli.md)), exposed through
a couple of extra endpoints and two frontend panels.

Everything in this page is gated behind a single flag and never active in production.

## Enabling it

Set an environment variable on the backend:

```sh
CROUTON_SCHEMA_EDITOR=true
```

Accepted truthy values: `true`, `1`, `yes` (case-insensitive). Anything else — including an unset variable — is
treated as `false`. There is no `NODE_ENV` fallback: the flag must be set explicitly.

The backend serves this as `isDev` on `/_app/layout`. The frontend reads it once via `useCrouton()` and exposes it
as `isDev`; nothing in the UI needs to be enabled manually — the edit button and the "Dev tools" sidebar link only
render when the connected backend reports `isDev: true`.

## Editing fields

Every resource table gets an **Edit fields** button next to **Add record** when dev mode is on. It opens a modal
listing each column with:

- `label` and `column`
- `fieldInput.position` and `fieldInput.options.colspan`
- `hiddenInTable`, `hiddenInForm`, `hiddenInView` checkboxes

Saving sends a `PATCH` to `<route>/resource.json` with only the fields that changed, which are merged into the
existing file and written back with a stable `JSON.stringify(config, null, 2)` — untouched fields and formatting
elsewhere in the file are left alone. The frontend then invalidates that resource's cached form definition, so the
table and form reflect the change immediately without a reload.

There's no locking: if two people edit the same resource at once, the last save wins. This is an accepted MVP
trade-off, not a bug.

## Dev tools panel

A **Dev tools** entry appears in the admin sidebar when dev mode is on, linking to a panel with two independent
flows for keeping resources in sync with the database.

### Generate from database

Lists Prisma models that don't have a resource yet. Clicking **Generate** for a model runs introspection and writes
a brand-new `resource.json` for it (map-form columns, the same defaults `crouton update resources` applies — see
[What gets generated](./cli.md#what-gets-generated)).

### Reload from database

For resources that already exist, this mirrors the CLI's reconciliation flow instead of silently overwriting files:

1. **Check for changes** — diffs every resource (or a chosen subset) against the current schema and shows what
   would change, without writing anything.
2. Review the plan and pick which resources to apply — all are selected by default.
3. **Apply selected** — writes only the chosen resources.

Both actions refresh the frontend afterwards: all cached form definitions are invalidated and `/_app/layout` is
re-fetched, so new or changed resources show up without a page reload.

### What it doesn't do

The dev tools never run `prisma db pull` or `prisma generate` — those touch your Prisma schema and need database
credentials, and stay CLI-only (`crouton update resources`, see [CLI](./cli.md)). The panel only reads the
already-generated Prisma client and Zod types to diff and write `resource.json` files.

## Backend endpoints

All of the following return `403` unless `CROUTON_SCHEMA_EDITOR` is enabled.

| Endpoint                   | Method  | Description                                                     |
| -------------------------- | ------- | --------------------------------------------------------------- |
| `<route>/resource-columns` | `GET`   | Editable column list for one resource.                          |
| `<route>/resource.json`    | `PATCH` | Merge a column patch into that resource's `resource.json`.      |
| `/_app/resources/models`   | `GET`   | Prisma models and whether each already has a resource.          |
| `/_app/resources/sync`     | `POST`  | Generate a `resource.json` for a single model.                  |
| `/_app/resources/plan`     | `POST`  | Diff resources (all or selected) against the database; dry run. |
| `/_app/resources/apply`    | `POST`  | Write the resources chosen from a `plan` response.              |
