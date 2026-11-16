# Branch rulesets

GitHub does not read these files. the JSON files are the source for the rulesets of this repo; apply them with
the API after changing it (needs repo admin).

```sh
# first time
for f in main review tags; do gh api -X POST repos/GhentCDH/crouton/rulesets --input .github/rulesets/$f.json; done

# update: look up the id, then replace
gh api repos/GhentCDH/crouton/rulesets -q '.[] | "\(.id) \(.name)"'
gh api -X PUT repos/GhentCDH/crouton/rulesets/<id> --input .github/rulesets/main.json
```

Bypass actor everywhere: the `ghentcdh-developers` team (id `10315561`). Nobody else bypasses, admins included.

### `main.json`: checks

- no deletion, no force push
- required checks: `ci / build`, `ci / test`, `ci / lint`, `ci / typecheck`, `ci / knip`, `duplicate-exports`, `e2e`
- team bypass exists only because `pnpm release` pushes the release commit straight to `main`; do not tick
  "bypass rules" to merge a PR with failing checks

Required check names come from the workflow job names (`ci / …` = jobs of the shared CI workflow). Update
`main.json` when a job is renamed, otherwise pull requests wait forever on a check that never reports.

### `review.json`: outside contributors

- changes go through a pull request with 1 approval (anyone with write access); new pushes dismiss it
- `.github/workflows/pr-author.yml` approves PRs whose author has write access (needs repo setting "Allow GitHub
  Actions to create and approve pull requests"), so team members merge their own PRs without a second person and
  without the "bypass rules" box; it also assigns the PR author
- the team bypass on this ruleset only exists for the release push to `main`
- `CODEOWNERS` auto-requests a review from `@bovandersteene` on every PR

## `tags.json`: release tags

A `v*` tag triggers the `Publish` workflow, so pushing one is publishing to npm. This ruleset lets only the
`ghentcdh-developers` team create, move or delete `v*` tags, so only the team can release.

```sh
gh api -X POST repos/GhentCDH/crouton/rulesets --input .github/rulesets/tags.json
```
