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
  }[];
}
```

### Database checks

Each registered data source gets a `SELECT 1` query with a 3-second timeout. Connection strings in error messages are automatically stripped.

### Resource load errors

Since crouton `0.0.1-alpha.35`, a malformed `resource.json` or `data-source.json` no longer crashes boot. The invalid file is skipped, the error is recorded, and the rest of the resources load normally. The status endpoint surfaces these errors in the `resources` array.

## Frontend — `/crouton/status`

The `StatusView` is included in `CroutonRouter` by default, so any app using crouton gets it at the `/crouton/status` path (relative to wherever `CroutonRouter` is mounted).

The page shows:

- **Backend connectivity** — green "Running" / red "Down" based on whether the fetch succeeds
- **Summary banner** — "All systems operational" or "N issue(s) detected"
- **Version badges** — app version, crouton version, environment
- **Databases list** — green/red dot per data source, with error text on failure
- **Resources list** — green/red dot per resource, with parse error on failure

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
