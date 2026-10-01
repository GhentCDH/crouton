# Status page

Crouton ships a built-in status endpoint and frontend page that report version info, environment, database connectivity,
and resource load health. **Problems are surfaced first** — errors and warnings appear in a summary panel at the top;
healthy rows are visible below.

## Backend — `GET /crouton/status.json`

Registered automatically by `CroutonApiModule`. Always returns HTTP 200; failures are communicated in the JSON body.

### Response shape

```ts
interface CroutonStatus {
  version: string;          // APP_VERSION env var, or "unknown"
  croutonVersion: string;   // @ghentcdh/crouton-api package version
  environment: string;      // ENVIRONMENT ?? NODE_ENV ?? "unknown"
  summary: {
    ok: boolean;            // true when no errors (warnings do not affect ok)
    databaseErrors: number;
    resourceErrors: number;
    warningCount: number;   // total warnings across all resources
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
    hidden?: boolean;          // in the repo but hidden from the sidebar
    kind?: 'prisma' | 'custom';
    customOperations?: string[];
    warnings?: string[];
  }[];
  i18n?: {
    active: boolean;
    defaultLanguage: string;
    bundles: { language: string; emptyKeys: number }[];
  };
}
```

### Custom resources

A [custom resource](../resource/custom-resource.md) is tagged `kind: 'custom'` and lists the operations its
`repository.ts` implements. A resource whose repository is missing, broken, or does not cover an enabled operation is
reported as **invalid** (`valid: false`) and skipped at boot, rather than failing silently on the first request.

### Resource warnings

Non-fatal issues detected during load appear as `warnings` on the resource row. The resource is still served; warnings
do **not** set `valid: false` or increment `resourceErrors`. Current sources:

| Warning | Cause |
|---------|-------|
| `"database" is set alongside kind: "custom"` | `database` selects `ctx.prisma`; data still comes from `repository.ts`. Usually harmless, but the field is redundant. |
| `"upsert" enabled on a custom resource` | Custom resources have no PUT handler for upsert — disable the operation or implement it. |
| `repository.ts present on a prisma resource` | The file is ignored. Set `kind: "custom"` if you intended to use it. |
| `All operations disabled` | The resource serves no endpoints. |

### Database checks

Each registered data source is probed via its adapter's `healthCheck()`. The built-in `PrismaDataSourceAdapter` runs
`SELECT 1` with a 3-second timeout. Custom adapters that omit `healthCheck` are reported as connected without probing.
Connection strings in error messages are automatically redacted.

### Resource load errors

Since crouton `0.0.1-alpha.35`, a malformed `resource.json` or `data-source.json` no longer crashes boot. The invalid
file is skipped, the error is recorded, and the rest of the resources load normally. The status endpoint surfaces these
errors in the `resources` array.

Each loaded resource reports its `version`. Two more states show up here:

- **Needs migration** — a `resource.json` whose `schemaVersion` differs from what crouton expects. It carries
  `expectedVersion` and is `valid: false`; the fix is to migrate it (automatic in dev).
  See [Versioning & migrations](../resource/resource-versioning.md).
- **Draft** — a resource with `draft: true` is present but intentionally not served. It does **not** count as a
  resource error. See [Draft resources](../resource/resource-versioning.md#draft-resources).

## Frontend — `/crouton/status`

The status page is included in `CroutonRouter` by default, at `crouton-status` (named route `CROUTON_STATUS`). It is
mounted **outside** `AdminView` so it renders even when the backend is broken — exactly when you need it most.

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ ● Crouton status     app v1.2 · crouton v0.0.1 · dev           │
│   3 errors · 2 warnings       checked 12:04:31 [↻] [auto ▢]   │
├────────────────────────────────────────────────────────────────┤
│ [DB 1/2]  [Resources 14/16]  [Warnings 2]  [i18n 12 missing]  │
├────────────────────────────────────────────────────────────────┤
│ ✖ database  main      connection refused (ECONNREFUSED)    →   │
│ ✖ resource  books     Unknown field "autor" in columns     →   │
│ ▲ resource  authors   needs migration to v3                →   │
│ ▲ i18n      nl        12 untranslated keys                 →   │
├────────────────────────────────────────────────────────────────┤
│ Databases                                                      │
│ Resources  [All|Errors|Warnings|Draft|Hidden] [search…]        │
│   ▸ books   ✖ error   v2  prisma                               │
│   ▸ authors ▲ migrate v2→v3                                    │
│ Enums (collapsed)                                              │
│ Translations                                                   │
│ Raw JSON  [copy] [download]   (collapsed)                      │
└────────────────────────────────────────────────────────────────┘
```

**Issues panel** (top): hidden when everything is healthy ("All good" card shown instead). Each row links to the
relevant section below and auto-expands that row.

**Stat tiles**: clickable — sets the resource filter or scrolls to the section.

**Resource rows**: collapsed by default; **error rows auto-expand**. The expanded body shows path, kind, custom
operations, version, the full error in a copy-able `<pre>`, warnings, and dev actions (Publish / Add to menu / Remove
from menu).

**Backend down**: a full-width error card with the fetch error and a Retry button replaces the rest of the page.

### URL state

Filter and search are kept in the query string so links can be shared:

```
/crouton/status?filter=errors&q=book
```

`filter` accepts: `all` (default), `errors`, `warnings`, `draft`, `hidden`.

### Auto-refresh

Toggle the **auto** checkbox in the header to poll `GET /crouton/status.json` every 10 seconds. Polling stops
automatically when the component is unmounted.

### Named route

Navigate programmatically with the exported constant:

```ts
import { CROUTON_STATUS } from '@ghentcdh/crouton-vue';

router.push({ name: CROUTON_STATUS });
```

### Standalone route

To mount the status page at a custom path, import `CroutonStatusRoutes` instead:

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

### `useCroutonStatus` composable

The data layer is exposed as a composable for custom status views or sidebar health indicators:

```ts
import { useCroutonStatus } from '@ghentcdh/crouton-vue';

const {
  status,       // Ref<CroutonStatus | null>
  loading,      // Ref<boolean>
  error,        // Ref<string | null>
  backendUp,    // Ref<boolean>
  lastChecked,  // Ref<Date | null>
  autoRefresh,  // Ref<boolean>
  refresh,      // () => Promise<void>
  toggleAutoRefresh,
  publishResource,   // (name: string) => Promise<void>  — dev only
  addToMenu,         // (name: string) => Promise<void>  — dev only
  removeFromMenu,    // (name: string) => Promise<void>  — dev only
} = useCroutonStatus();

await refresh();
```

### Raw JSON

The bottom of the page has a collapsible `<pre>` with the full JSON. The **download** button saves
`crouton-status-<env>-<timestamp>.json` — handy for bug reports.
