# Plan: VuePress documentation for crouton

Mirror the ghentcdh-monorepo docs setup, simplified to a **single docs site** (crouton has 2 packages vs ghentcdh's multi-site split). Note: `.github/workflows/publish-docs.yml` already exists in crouton and expects an nx `docs:build` target and a `docs/` site — this plan fills in the missing pieces.

## How ghentcdh is set up (reference)

- `docs/` folder with per-site VuePress apps (`core-site`, `ui-site`), each with `.vuepress/config.js`
- VuePress 2 (`2.0.0-rc.26`) + `vuepress-theme-hope` + `@vuepress/bundler-vite` + Tailwind 4 vite plugin
- `tools/doc/vuepress.mjs` script: copies `README.md` files from `libs/*` into `docs/`, then auto-generates `typedoc_sidebar.json` sidebar files per section
- `docs/project.json` nx targets: `build:menu` (run script) → `build` (vuepress build), `serve` (vuepress dev), with `dependsOn` chains
- Config uses `DOCS_BASE` env var for GitHub Pages base path, vite aliases to resolve workspace packages from source
- `.github/workflows/publish-docs.yml`: on tag push → nx build → upload to GitHub Pages

## Steps for crouton

### 1. Dependencies (root `package.json`, devDependencies)

```
vuepress                  2.0.0-rc.26
@vuepress/bundler-vite    2.0.0-rc.26
vuepress-theme-hope       2.0.0-rc.102
@tailwindcss/vite         ^4.2.1         (for live crouton-vue demos)
tailwindcss               ^4.2.1
sass                      ^1.97.0        (custom .vuepress/styles)
```

`crouton-vue` peer-depends on `@ghentcdh/ui` and `@ghentcdh/json-forms-vue` — install those as devDependencies too so demo pages can render components (same role the `dist/libs/ui` build plays in ghentcdh's ui-site).

### 2. Folder structure

```
docs/
├── project.json                  # nx targets
├── README.md                     # home page (copied from root README by menu script)
├── .vuepress/
│   ├── config.js
│   └── styles/                   # optional, copy from ghentcdh if styling needed
├── crouton-api/                  # populated from packages/crouton-api docs
│   └── typedoc_sidebar.json      # generated
├── crouton-core/
│   └── typedoc_sidebar.json      # generated
└── crouton-vue/
    └── typedoc_sidebar.json      # generated
```

### 3. Sidebar/menu generation script

Copy `tools/doc/vuepress.mjs` from ghentcdh → `tools/doc/vuepress.mjs`, replace the bottom section with:

```js
copyReadme('packages/crouton-api', 'crouton-api');
copyReadme('packages/crouton-core', 'crouton-core');
copyReadme('packages/crouton-vue', 'crouton-vue');
createMenu('crouton-api');
createMenu('crouton-core');
createMenu('crouton-vue');
copyReadme('', '', 1); // root README → docs home
```

Adjust `docsPath = 'docs/'` paths since crouton uses a single site (no `core-site/` prefix). ghentcdh runs this via `ts-node`, but the script is plain `.mjs` — run it with `node tools/doc/vuepress.mjs` and skip the ts-node dependency.

Write package docs as `README.md` (+ extra `.md` files) inside `packages/*` so they live next to the code, same convention as ghentcdh `libs/`.

### 4. `docs/project.json` (nx targets)

```json
{
  "name": "docs",
  "$schema": "../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "docs",
  "targets": {
    "build:menu": {
      "executor": "nx:run-commands",
      "options": { "command": "node tools/doc/vuepress.mjs" }
    },
    "build": {
      "executor": "nx:run-commands",
      "dependsOn": ["build:menu"],
      "options": { "command": "vuepress build docs" }
    },
    "serve": {
      "executor": "nx:run-commands",
      "dependsOn": ["build:menu"],
      "options": { "command": "vuepress dev docs" }
    }
  }
}
```

This matches what the existing workflow calls (`npx nx run docs:build`).

### 5. `docs/.vuepress/config.js`

Modeled on ghentcdh's `ui-site` config (Tailwind + vite aliases so demo pages import `@ghentcdh/crouton-vue` from source):

```js
import tailwindcss from '@tailwindcss/vite';
import { viteBundler } from '@vuepress/bundler-vite';
import { defineUserConfig } from 'vuepress';
import { hopeTheme } from 'vuepress-theme-hope';
import { fileURLToPath } from 'node:url';

import apiSideBar from '../crouton-api/typedoc_sidebar.json';
import coreSideBar from '../crouton-core/typedoc_sidebar.json';
import vueSideBar from '../crouton-vue/typedoc_sidebar.json';

export default defineUserConfig({
  base: process.env.DOCS_BASE ? `${process.env.DOCS_BASE}/` : '/',
  title: 'Crouton',
  description: 'Configure Resources Once, Use Them Over and Over, Naturally',
  pagePatterns: ['**/*.md', '!.vuepress', '!**/node_modules'],
  lastUpdated: true,
  bundler: viteBundler({
    viteOptions: {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@ghentcdh/crouton-vue': fileURLToPath(
            new URL('../../packages/crouton-vue/src/index.ts', import.meta.url),
          ),
          '@ghentcdh/crouton-core': fileURLToPath(
            new URL('../../packages/crouton-core/src/index.ts', import.meta.url),
          ),
        },
      },
    },
  }),
  theme: hopeTheme({
    docsRepo: 'https://github.com/GhentCDH/crouton',
    docsBranch: 'main',
    docsDir: 'docs',
    colorMode: 'light',
    socialLinks: [{ icon: 'github', link: 'https://github.com/GhentCDH/crouton' }],
    plugins: { mdEnhance: { tabs: true, codetabs: true, demo: true } },
    navbar: [{ text: 'Home', link: '/' }],
    sidebar: [
      { text: 'Crouton API', children: apiSideBar },
      { text: 'Crouton Core', children: coreSideBar },
      { text: 'Crouton Vue', children: vueSideBar },
    ],
  }),
});
```

For live `crouton-vue` demos the peer deps (`@ghentcdh/ui`, `@ghentcdh/json-forms-vue`, `vue-router`, `axios`, `@jsonforms/core`) must resolve in the docs build, and `@ghentcdh/ui/style.css` should be imported in `.vuepress/styles/index.scss` (ghentcdh ui-site does exactly this). Demo data/mocked API responses can live in `docs/data/` aliased as `@demo/data`, following the ghentcdh ui-site pattern — crouton demos will need a mocked axios/api layer since components fetch schemas from `/schemas` endpoints.

### 6. CI workflow fixes (`.github/workflows/publish-docs.yml` — already present)

Three corrections needed:

- `DOCS_BASE=/ghentcdh-crouton` → `/crouton` (Pages base must match repo name `GhentCDH/crouton`)
- `mkdir -p dist-pages` is missing before the `cp -r docs/.vuepress/dist/. dist-pages/` step
- Verify `.github/actions/use-cache` works here (it exists, copied from ghentcdh)

Also enable GitHub Pages (Settings → Pages → Source: GitHub Actions) on the repo.

### 7. Content seeding

- Write `README.md` for `crouton-api`, `crouton-core`, and `crouton-vue` (all copied into docs by the menu script)
- Split topics into extra `.md` files per package (`resource-json.md`, `repositories.md`; for crouton-vue: `admin-view.md`, `table.md`, `form.md`, `relation.md`, `router.md` matching its src modules) — the menu script picks them up automatically
- crouton-vue pages can include live demos via the mdEnhance `demo` plugin once aliases + mocked data are in place
- Add `docs/.gitignore` for generated files: `.vuepress/.cache`, `.vuepress/.temp`, `.vuepress/dist`; decide whether `typedoc_sidebar.json` + copied READMEs are committed (ghentcdh commits them) or gitignored and always regenerated

### 8. Verify

```
pnpm install
npx nx run docs:serve     # local dev at localhost:8080
npx nx run docs:build     # production build → docs/.vuepress/dist
```

Then tag-push or `workflow_dispatch` to test the Pages deploy.

## Order of work

1. Add deps (incl. Tailwind + crouton-vue peer deps) + `pnpm install`
2. Copy & adapt `tools/doc/vuepress.mjs`
3. Create `docs/.vuepress/config.js` (with vite aliases) + `docs/project.json`
4. Write/verify READMEs for all three packages
5. Run serve/build locally
6. Add live crouton-vue demo pages (mocked api/data)
7. Fix workflow (base path, mkdir), enable Pages, deploy
