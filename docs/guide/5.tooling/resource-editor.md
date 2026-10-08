# Resource editor

A dev-only panel built into the admin UI for managing resources without running the CLI.

Everything on this page is gated behind dev mode and never active in production.

## Enabling dev mode

```sh
CROUTON_SCHEMA_EDITOR=true
```

Accepted truthy values: `true`, `1`, `yes` (case-insensitive). Anything else is treated as `false`. There is no
`NODE_ENV` fallback: the flag must be set explicitly.

The backend serves this as `isDev` on `/_app/layout`. The frontend reads it once via `useCrouton()` and exposes it as
`isDev`; the "Dev tools" sidebar link only renders when the connected backend reports `isDev: true`.

## Dev tools panel

A **Dev tools** entry appears in the admin sidebar when dev mode is on, with three independent flows:

### Pull schema from database

Runs `prisma db pull` → `prisma-case-format` → `prisma generate` against the live database. This is the one action
here that needs real database credentials on the running backend and mutates `schema.prisma` directly.

`schema.prisma` is backed up to `schema.prisma.bak` first. If it has uncommitted changes, the endpoint returns
`requiresConfirmation` instead of pulling, and the panel asks you to confirm.

After pulling, a **Restart backend now** button calls `POST /_app/resources/restart`, which disconnects every
datasource's Prisma client and then exits the process (`process.exit(1)`). That only actually restarts anything if
this process is supervised (nodemon, nest start --watch, pm2, a Docker restart policy, etc.).

### Generate from database

Lists Prisma models that don't have a resource yet. Clicking **Generate** for a model writes a brand-new `resource.json`
for it (map-form columns, the same defaults `crouton update resources` applies).

### Reload from database

For resources that already exist, this mirrors the CLI's reconciliation flow:

1. **Check for changes** — diffs every resource against the current schema and shows what would change, without writing.
2. Review the plan and pick which resources to apply.
3. **Apply selected** — writes only the chosen resources.

## Backend endpoints

All of the following return `403` unless `CROUTON_SCHEMA_EDITOR` is enabled.

| Endpoint                 | Method | Description                                                                                                 |
|--------------------------|--------|-------------------------------------------------------------------------------------------------------------|
| `/_app/resources/models` | `GET`  | Prisma models, whether each has a resource, and whether the running backend's Prisma client can use it yet. |
| `/_app/resources/pull`   | `POST` | `db pull` + case-format + `generate` for a datasource; needs DB credentials.                                |
| `/_app/resources/restart`| `POST` | Disconnects datasources and exits the process; needs an external supervisor to actually restart it.         |
| `/_app/resources/sync`   | `POST` | Generate a `resource.json` for a single model.                                                              |
| `/_app/resources/plan`   | `POST` | Diff resources (all or selected) against the database; dry run.                                             |
| `/_app/resources/apply`  | `POST` | Write the resources chosen from a `plan` response.                                                          |
