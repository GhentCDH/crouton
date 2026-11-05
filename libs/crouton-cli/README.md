# @ghentcdh/crouton-cli

CLI for managing Crouton projects — update resources, datasources, and more.

## Local Development

Three ways to test your changes, ordered from fastest to most thorough.

### 1. Run the built CLI directly (quickest)

Best for: changes to `update resources` and other CLI commands.

```bash
# in the crouton repo
pnpm nx build crouton-cli
# or watch mode:
cd packages/crouton-cli && npx tsup --watch

# in your test project
node ~/path/to/crouton/packages/crouton-cli/dist/index.js update resources
```

Tip — add an alias so you don't retype the path:

```bash
alias crouton-dev="node ~/path/to/crouton/packages/crouton-cli/dist/index.js"
crouton-dev update resources
```

---

### 2. Run `create-crouton` from your checkout

Best for: changes to the scaffold flow (prompts, templates, next-steps output).

```bash
pnpm nx build create-crouton
cd ~/project/workshop_crouton
node ~/path/to/crouton/packages/create-crouton/dist/index.js my-app
```

Local templates are bundled into `dist`, so you get your edits. The generated `package.json` still references `@ghentcdh/*@<version>`, so `pnpm install` pulls from npm — fine for testing prompts and templates. Pass `--no-install` to skip the install step.

---

### 3. Local npm registry via Verdaccio (most complete)

Best for: testing the full `npx @ghentcdh/create-crouton` flow, including the install step, an unpublished `crouton-cli`, and `crouton-prisma`. Run this at least once before cutting a release.

```bash
# start the registry (http://localhost:4873)
npx verdaccio

# build everything and publish each package to the local registry
pnpm nx run-many -t build
(cd packages/crouton-cli/dist    && npm publish --registry http://localhost:4873)
(cd packages/create-crouton      && npm publish --registry http://localhost:4873)
# repeat for crouton-core / crouton-api / crouton-vue / crouton-prisma

# scaffold using only the local registry
cd ~/project/workshop_crouton
npm_config_registry=http://localhost:4873 npx @ghentcdh/create-crouton@latest my-app
```

Before republishing the same version, either bump it (e.g. `0.0.1-local.2`) or unpublish first:

```bash
npm unpublish --force --registry http://localhost:4873 @ghentcdh/crouton-cli
```

Verdaccio proxies anything it doesn't have through to the public npm registry. You can also let Nx manage the registry setup:

```bash
pnpm nx g @nx/js:setup-verdaccio
# then use:
pnpm nx local-registry
```

---

### Which option to use?

| Situation | Option |
|-----------|--------|
| Fixing a CLI command (`.env`, schema, etc.) | **1** |
| Changing scaffold prompts or templates | **2** |
| Pre-release smoke test (e.g. before alpha.83) | **3** |
