# Contributing to crouton

Thanks for helping out! crouton is still in alpha, so APIs move fast — open an issue before starting anything
large so we can agree on the approach first.

By participating you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).
Security issues go through the [Security Policy](./SECURITY.md), **not** public issues.

## Ways to contribute

- **Report a bug** — use the _Bug report_ issue form. A minimal `resource.json` that reproduces the problem helps a lot.
- **Suggest a feature or improvement** — use the _Feature request_ or _Improvement_ form.
- **Improve the docs** — everything under `docs/guide/` is fair game.
- **Send a pull request** — for bugs, small improvements, or anything already agreed on in an issue.

## Development setup

Requirements: **Node 24** and **pnpm** (version pinned in `package.json` → `packageManager`; `corepack enable`
picks it up).

```sh
git clone https://github.com/GhentCDH/crouton.git
cd crouton
pnpm install

pnpm nx run-many -t build        # build all packages
pnpm nx run-many -t test         # unit tests
pnpm nx run-many -t lint         # lint (CI fails on lint errors — typecheck does not catch them)
pnpm nx run-many -t typecheck
pnpm docs:serve                  # docs site on localhost
```

This is an [Nx](https://nx.dev) monorepo — always run tasks through `pnpm nx`, and prefer
`pnpm nx affected -t lint test` while iterating.

The example app in `examples/book-collection` is the easiest way to try changes end-to-end.

## Where does code go?

| Package                                                                       | Contains                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `crouton-core`                                                                | Browser-safe schemas, types and builders. **No Node-only imports.** |
| `crouton-codegen`                                                             | Shared Node-only codegen / Prisma tooling (used by CLI and API)     |
| `crouton-api`                                                                 | NestJS operation handlers, adapters, middleware                     |
| `crouton-vue` / `crouton-forms-vue` / `crouton-ui-vue` / `crouton-editor-vue` | Vue UI                                                              |
| `crouton-cli`, `create-crouton`, `add-crouton`                                | CLI tooling                                                         |

Step-by-step recipes (adding a field input type, a resource option, an HTTP operation, a compile step, …) live in
[`CLAUDE.md`](./CLAUDE.md) under _Development patterns_.

`plans/` holds design notes, not documentation — the source of truth is the code and `docs/guide`.

## Code style

- Arrow functions everywhere: `const foo = () => { … }`.
- Vue props use runtime object syntax in a sibling `*.properties.ts` file (not `defineProps<{…}>()`).
- Formatting is Prettier; the pre-commit hook runs lint + format on affected projects.

## Generated files

Changing a Zod schema in `crouton-core` regenerates JSON Schemas and docs. Run

```sh
pnpm nx run crouton-core:build
```

and commit the result. CI fails if these are out of date:

- `packages/crouton-core/src/lib/resource/resource.schema*.json`
- `docs/.vuepress/public/schema/`
- `docs/guide/2.resources/field-inputs/_generated/`

## Commits and pull requests

- Branch from `main`.
- Use [Conventional Commits](https://www.conventionalcommits.org/) with the package as scope, e.g.
  `fix(api): …`, `feat(core): …`, `refactor(core,api): …`, `docs: …`. Mark breaking changes with `!`
  (`refactor(core)!: …`).
- PR titles follow the same format — they end up in the release notes.
- Keep PRs focused; one logical change per PR.
- Add or update tests, and update `docs/guide` for user-facing changes.
- Fill in the pull request template.

## Releasing (maintainers)

```sh
pnpm release prerelease --preid alpha
```

Run it on an up-to-date `main` with a clean working tree. The release commit and tag are pushed
straight to `main`: with the branch ruleset active, only repository admins can do that.

`--preid alpha` is required: without it `nx release` only looks for stable tags, does not find `v0.0.1-alpha.N`
and stops with "No git tags matching pattern". Do not work around that with `--first-release`: it falls back to
the version on disk and builds the changelog as if no earlier release existed.

What happens:

1. **On your machine** (`release` script = `nx release --skip-publish`): builds, bumps the package versions,
   updates `RELEASE_NOTES.md`, commits `chore(release): publish <version>` and tags `v<version>`. Nothing is
   published and no GitHub release is created.
2. **`postrelease` script**: `git push --follow-tags --atomic` pushes the commit and the tag.
3. **On GitHub**, triggered by the tag:
   - `Publish`: publishes the packages to npm (trusted publishing, no token) and creates the GitHub release.
     Its notes are generated by GitHub from the merged pull requests, grouped by label (`.github/release.yml`),
     so PR titles and labels are what readers see.
   - `Publish Docs`: builds and deploys the documentation site.

Check the `Publish` run afterwards: it fails if a package could not be published, and the release notes list
which packages made it.

### Use the script, not `nx release` directly

`npx nx release …` skips the two things the script adds:

- It asks **"Do you want to publish these versions?"**. Answer **No**: "Yes" publishes from your machine instead
  of from the workflow. Never pass `--yes`, it answers "Yes" for you. (`--skip-publish` cannot be set in
  `nx.json`, only on the command line, which is why it lives in the script.)
- It does not push. Run `git push --follow-tags --atomic` yourself afterwards.

### Try it first

```sh
pnpm nx release prerelease --preid alpha --skip-publish --dry-run
```

shows the new version and changelog entry without changing anything.

### Undo a release that is not pushed yet

The commit and tag only exist locally until the push. To drop the last one:

```sh
git tag -d v<version>
git reset --hard HEAD~1
```

Once the tag is pushed the release is out: fix forward with a new release instead.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
