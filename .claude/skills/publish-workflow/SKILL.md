---
name: publish-workflow
description: This skill should be used when a new package is added to the crouton workspace, when scaffolding a new library or package, or when the user asks to "add a package to the publish workflow", "register a new package for publishing", or "update publish.yml for a new package". Ensures newly created packages that are publicly published are wired into the GitHub Actions publish workflow and have an npm badge in the README.
version: 0.1.0
---

# Publish Workflow — New Package Registration

When a new package is created in `packages/` and it is **not** private (`private` is absent or `false` in its `package.json`), three files must be updated.

## Checklist

### 1. `.github/workflows/publish.yml`

Add two things:

**A — new publish step** (after the last existing `Publish @ghentcdh/...` step, before `Create GitHub Release`):

```yaml
- name: Publish @ghentcdh/<package-name>
  id: pub_<project_id>
  continue-on-error: true
  run: npx nx release publish --projects=<project-name> --access public --verbose
  shell: bash
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
    NPM_CONFIG_PROVENANCE: true
```

Where:
- `<project-name>` = Nx project name (the directory name under `packages/`, e.g. `crouton-auth`)
- `<project_id>` = step id — replace hyphens with underscores (e.g. `pub_crouton_auth`)
- `@ghentcdh/<package-name>` = the npm name from `package.json`

**B — status line in `Create GitHub Release` step**, inside the bash block alongside the other `[ ... ] && echo ... || echo ...` lines:

```bash
[ "${{ steps.pub_<project_id>.outcome }}" = "success" ] && echo "- ✅ \`@ghentcdh/<package-name>\`" >> release_body.md || echo "- ❌ \`@ghentcdh/<package-name>\`" >> release_body.md
```

### 2. `README.md`

Add an npm version badge to the badge block near the top of the file (the block ending around line 15), following the existing pattern:

```markdown
[![<package-name>](https://img.shields.io/npm/v/@ghentcdh/<package-name>.svg?label=<package-name>)](https://www.npmjs.com/package/@ghentcdh/<package-name>)
```

### 3. Skip if private

If `package.json` contains `"private": true`, skip all of the above — private packages are not published to npm.

## Example

New package: `packages/crouton-foo` with `"name": "@ghentcdh/crouton-foo"` and no `private` field.

**publish.yml — new step:**
```yaml
- name: Publish @ghentcdh/crouton-foo
  id: pub_crouton_foo
  continue-on-error: true
  run: npx nx release publish --projects=crouton-foo --access public --verbose
  shell: bash
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
    NPM_CONFIG_PROVENANCE: true
```

**publish.yml — release step addition:**
```bash
[ "${{ steps.pub_crouton_foo.outcome }}" = "success" ] && echo "- ✅ \`@ghentcdh/crouton-foo\`" >> release_body.md || echo "- ❌ \`@ghentcdh/crouton-foo\`" >> release_body.md
```

**README.md badge:**
```markdown
[![crouton-foo](https://img.shields.io/npm/v/@ghentcdh/crouton-foo.svg?label=crouton-foo)](https://www.npmjs.com/package/@ghentcdh/crouton-foo)
```
