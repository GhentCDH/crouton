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

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
