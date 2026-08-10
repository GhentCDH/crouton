# Status page

Crouton ships a built-in status endpoint and frontend page that report version info, environment, database connectivity, and resource load health.

## Backend — `GET /crouton/status.json`

Registered automatically by `CroutonApiModule`. Always returns HTTP 200; failures are communicated in the JSON body.

### Response shape

```ts
interface CroutonStatus {
  version: string;          // APP_VERSION env var, or "unknown"
  croutonVersion: string;   // @ghentcdh/crouton-api package version
  environment: string;      // ENVIRONMENT ?? NODE_ENV ?? "unknown"
  summary: {
    ok: boolean;            // true when no errors
    databaseErrors: number;
    resourceErrors: number;
  };
  databases: {
    name: string;
    connected: boolean;
    error?: string;         // connection strings are redacted
  }[];
  resources: {
    name: string;
    path: string;
    valid: boolean;
    error?: string;
    version?: number;          // loaded/expected schema version
    expectedVersion?: number;  // set when the file's version differs from what crouton expects
    draft?: boolean;           // present in the repo but intentionally not loaded/served
  }[];
}
```

### Database checks

Each registered data source gets a `SELECT 1` query with a 3-second timeout. Connection strings in error messages are automatically stripped.

### Resource load errors

Since crouton `0.0.1-alpha.35`, a malformed `resource.json` or `data-source.json` no longer crashes boot. The invalid file is skipped, the error is recorded, and the rest of the resources load normally. The status endpoint surfaces these errors in the `resources` array.

Each loaded resource reports its `version`. Two more states show up here:

- **Needs migration** — a `resource.json` whose `schemaVersion` differs from what crouton expects. It carries `expectedVersion` and is `valid: false`; the fix is to migrate it (automatic in dev). See [Versioning & migrations](./resource-versioning.md).
- **Draft** — a resource with `draft: true` is present but intentionally not served. It reports `draft: true` and `valid: true`, and does **not** count as a resource error. See [Draft resources](./resource-versioning.md#draft-resources).

## Frontend — `/crouton/status`

The `StatusView` is included in `CroutonRouter` by default, so any app using crouton gets it at the `/crouton/status` path (relative to wherever `CroutonRouter` is mounted).

The page shows:

- **Backend connectivity** — green "Running" / red "Down" based on whether the fetch succeeds
- **Summary banner** — "All systems operational" or "N issue(s) detected"
- **Version badges** — app version, crouton version, environment
- **Databases list** — green/red dot per data source, with error text on failure
- **Resources list** — a dot per resource (green loaded, red failed, gray draft), a `v{version}` badge, an amber "needs migration" line for out-of-date files, and a "draft — not loaded" badge for drafts

### Standalone route

If you prefer to mount it at a different path, import `CroutonStatusRoutes` instead:

```ts
import { CroutonStatusRoutes } from '@ghentcdh/crouton-vue';

const routes = [
  // ...your routes
  {
    path: '/my-status',
    children: CroutonStatusRoutes,
  },
];
```
