Status: planned
# Status Page Redesign Plan

Goal: turn `GET /crouton/status.json` into a frontend page where **what goes wrong is visible at a glance** — problems first, details second, raw JSON as a fallback. Tailwind only (using the daisyUI theme tokens already exposed in `crouton-vue/src/styles.css`).

## Current state

- `packages/crouton-vue/src/status/StatusView.vue` (324 lines) already renders the JSON, but as one long list: errors are mixed in between healthy rows, no filtering, no refresh, hard-coded `green-*/red-*/gray-*` colours.
- Two routes point at the same view:
  - `CroutonRouter` → `status` (sibling of the `AdminView` layout, no name)
  - `CroutonStatusRoutes` → `crouton-status` (exported, only used by `status.spec.ts`)
- Types are duplicated in `crouton-api/.../status.types.ts` and `crouton-vue/src/status/status.types.ts`.

## 1. Route

- Add `CROUTON_STATUS = \`${CROUTON_PREFIX}/status\`` to `src/router.ts`.
- Keep **one** route: `{ path: 'crouton-status', name: CROUTON_STATUS, component: () => import('./status/StatusView.vue') }` in `CroutonRouter`, **outside** `AdminView`.
  - Why outside: `AdminView` depends on `/_app/layout`; when the backend is broken the status page must still render (that is exactly when you need it).
- Keep `status` as `redirect: { name: CROUTON_STATUS }` for backwards compatibility.
- `CroutonStatusRoutes` → re-export the same route object (no second definition); update `status.spec.ts`.
- Add a "Status" link in the `AdminView` sidebar footer with a coloured dot (ok / warning / error) — optional, phase 2.

## 2. Data layer

`src/status/useCroutonStatus.ts` (composable)
- `status`, `loading`, `error`, `backendUp`, `lastChecked`
- `refresh()`, `autoRefresh` (ref<boolean>, polls every 10s via `setInterval`, cleared on unmount)
- Moves the publish / add-to-menu / remove-from-menu actions out of the view.

`src/status/status.utils.ts` (pure, unit-tested)
- `collectIssues(status): StatusIssue[]` — flattens everything that is wrong into one list:
  ```ts
  type StatusIssue = {
    severity: 'error' | 'warning' | 'info';
    source: 'backend' | 'database' | 'resource' | 'i18n';
    target: string;      // db / resource name / language
    message: string;
    anchor: string;      // id to scroll to
  };
  ```
  - database `connected: false` → error
  - resource `!valid` → error; `expectedVersion !== version` → warning ("needs migration to vN"); each `warnings[]` → warning
  - i18n `emptyKeys > 0` → warning; `active: false` → info
  - drafts are **not** issues (informational)
- `resourceState(res): 'error' | 'migration' | 'warning' | 'draft' | 'hidden' | 'ok'` — single source for badge/dot colour.
- `sortResources()` — errors first, then warnings, then the rest alphabetically.

## 3. Layout (top → bottom)

```
┌──────────────────────────────────────────────────────────────┐
│ ● Crouton status        app v1.2 · crouton v0.0.1 · dev      │
│   3 errors · 2 warnings      checked 12:04:31 [↻] [auto ▢]   │  StatusHeader
├──────────────────────────────────────────────────────────────┤
│ [DB 1/2] [Resources 14/16] [Warnings 2] [i18n 12 missing]    │  StatusStatTiles
├──────────────────────────────────────────────────────────────┤
│ ✖ database  main      connection refused (ECONNREFUSED)  →   │
│ ✖ resource  books     Unknown field "autor" in columns   →   │  StatusIssuesPanel
│ ▲ resource  authors   needs migration to v3              →   │  (hidden when empty,
│ ▲ i18n      nl        12 untranslated keys               →   │   shows "All good" card)
├──────────────────────────────────────────────────────────────┤
│ Databases                                                    │  StatusDatabaseList
│ Resources  [All|Errors|Warnings|Draft|Hidden] [search…]      │  StatusResourceList
│   ▸ books   ✖ error   v2  prisma            (expanded)       │    └ StatusResourceRow
│   ▸ authors ▲ migrate v2→v3                                  │
│ Enums (existing StatusEnumsSection, collapsed by default)    │
│ Translations                                                 │  StatusI18nSection
│ Raw JSON  [copy] [download]   (collapsed <pre>)              │  StatusRawJson
└──────────────────────────────────────────────────────────────┘
```

Behaviour
- Header background + dot follow the worst state: `error` > `warning` > ok; "Backend down" is its own full-width error card with the fetch message and a Retry button (rest of page hidden).
- Stat tiles are clickable: set the resource filter / scroll to the section.
- Issue rows link to `#resource-<name>` / `#db-<name>` and auto-expand that row.
- Resource rows: collapsed by default, **errors auto-expanded**. Expanded body shows path, kind, custom ops, version, full error in a `<pre>` (monospace, wrap, copy button), warnings list, dev actions (Publish / Add to menu / Remove from menu).
- Filter + search state kept in the URL query (`?filter=errors&q=book`) so a link to "what's broken" can be shared.
- Raw JSON: collapsed, pretty-printed, copy + download (`crouton-status-<env>-<timestamp>.json`) — handy for bug reports.

## 4. Styling (Tailwind)

- Use theme tokens, not raw palette colours: `bg-base-100/200`, `text-base-content`, `border-base-300`, `text-error` / `bg-error/10` / `border-error/40`, same for `warning`, `success`, `info`.
- One mapping in `status.utils.ts`: `stateClasses[state] = { dot, badge, border, text }` so every component uses the same colours.
- Container `max-w-5xl mx-auto p-6 space-y-6`; tiles `grid grid-cols-2 md:grid-cols-4 gap-3`; rows `rounded-lg border`, `divide-y`.
- Icons: inline SVG (as in `StatusEnumsSection`), no new dependency.
- Dark mode comes for free through the daisyUI tokens.

## 5. Files

```
packages/crouton-vue/src/status/
  StatusView.vue                     (container only, ~60 lines)
  useCroutonStatus.ts
  status.utils.ts / status.utils.spec.ts
  status.routes.ts / status.spec.ts  (updated)
  components/
    StatusHeader.vue            + .properties.ts
    StatusStatTiles.vue         + .properties.ts
    StatusIssuesPanel.vue       + .properties.ts
    StatusDatabaseList.vue      + .properties.ts
    StatusResourceList.vue      + .properties.ts
    StatusResourceRow.vue       + .properties.ts
    StatusI18nSection.vue       + .properties.ts
    StatusRawJson.vue           + .properties.ts
  StatusEnumsSection.vue             (move to components/, add .properties.ts)
packages/crouton-vue/src/router.ts   (CROUTON_STATUS, single route + redirect)
docs/guide/1.setup/status.md         (route name, screenshot, issue rules)
```

Code style (CLAUDE.md): arrow functions only; props via runtime object syntax in `*.properties.ts`.

## 6. Steps

1. `status.utils.ts` + specs (`collectIssues`, `resourceState`, `sortResources`) — test against fixtures: all ok, db down, invalid resource, migration, warnings, i18n gaps, drafts.
2. `useCroutonStatus.ts` (fetch/refresh/poll/actions).
3. Route consolidation + `CROUTON_STATUS` + update `status.spec.ts`.
4. Components, top-down: Header → StatTiles → IssuesPanel → ResourceList/Row → Database/I18n → RawJson.
5. Slim `StatusView.vue` to wiring only.
6. Verify in `examples/book-collection` with broken fixtures (stop the DB, add an invalid resource.json, old schema version) — `pnpm nx serve` for api + frontend.
7. `pnpm nx run-many -t lint,test,build -p crouton-vue`.
8. Update docs.

## Optional / later

- Move the shared status types into `crouton-core` (browser-safe) and import them in both `crouton-api` and `crouton-vue` instead of keeping two copies.
- Sidebar health dot in `AdminView` (reuses `useCroutonStatus`, poll only while visible).
- Backend: add `checkedAt` timestamp and per-db latency to the JSON.
