# Plan: `block` / `needs review` merge-gate labels

## Context

- `pr-author.yml` auto-approves every PR whose author has write access. AI agents (Claude Code, Copilot) push under the team member's account, so AI-written PRs get approved and become mergeable with no human look.
- Wanted:
  1. Label **`block`** on a PR → merge impossible.
  2. Label **`needs review`** auto-added when an AI tool opens a PR or pushes a commit → merge impossible until a human removes it.
- Same setup later for `annotation-editor` and `vue_component_annotated_text` (annotation component).
- Decisions (from user):
  - AI detection = **branch prefix**.
  - Team ruleset bypass stays (needed for `pnpm release` push to `main`). Document: never tick "bypass rules" to merge past these labels.

## Design

GitHub can't block merges on labels directly. A required status check that fails while a blocking label is on the PR does the job.

### 1. Shared reusable workflow — `crouton/.github/workflows/shared-merge-gate.yml`

Lives in crouton like the other `shared-*.yml` files. The other repos call it `@main`.

- `on: workflow_call`, input `ai-branch-prefixes` (default `ai/,claude/,copilot/,codex/`).
- Single job **`gate`**, no checkout (safe under `pull_request_target`):
  1. **Tag AI work.** If the event is `opened` / `reopened` / `synchronize` and `github.head_ref` starts with an AI prefix: `gh pr edit --add-label "needs review"`.
     - Runs on every push, so a new AI commit re-adds the label after a human removed it.
  2. **Gate.** Read the PR's *current* labels via `gh pr view --json labels`, not the event payload. Needed because labels added with `GITHUB_TOKEN` don't trigger new workflow runs, so step 1's label must be seen in the same run.
     - Fail with a clear message if `block` or `needs review` is present.
     - Write a line to `$GITHUB_STEP_SUMMARY`.

### 2. Caller in each repo — `.github/workflows/merge-gate.yml`

```yaml
name: Merge gate
on:
  pull_request_target:
    types: [opened, reopened, synchronize, labeled, unlabeled]
permissions:
  pull-requests: write
jobs:
  merge-gate:
    uses: GhentCDH/crouton/.github/workflows/shared-merge-gate.yml@main
```

- Required check name: **`merge-gate / gate`**.
- `pull_request_target` pattern is already used by `pr-author.yml`: write token for fork PRs, PR code never checked out.
- `labeled` / `unlabeled` re-run the check on the same head SHA, so removing the label turns it green with no new push.

### 3. Labels — `.github/labels.yml`

Add to `labels.yml`; the shared labeler syncs labels on the next PR:
- `block` — red `b60205`, "Do not merge"
- `needs review` — yellow `fbca04`, "AI-authored, needs human review before merge"

### 4. Ruleset — `.github/rulesets/main.json`

- Add `{ "context": "merge-gate / gate" }` to `required_status_checks`.
- Apply with the `gh api -X PUT …/rulesets/<id>` command from `.github/rulesets/README.md`. Needs repo admin; the user runs it.
- README: document both labels, the AI branch prefixes, and "don't bypass to merge past them".

### 5. Make AI tools use the prefix

- Project `CLAUDE.md` and the user's global `~/.claude/CLAUDE.md` PR workflow: AI-created branches start with `claude/` (e.g. `claude/feat/…`).
- Copilot coding agent already uses `copilot/…`.
- `.github/labeler.yml`: allow an optional AI prefix in `head-branch` patterns, e.g. `'^(?:(?:ai|claude|copilot|codex)/)?(feat|feature|enhancement)[/_-]'`, so type labels still apply.

### 6. Who may remove `needs review`

- Anyone with triage/write. Accepted ceiling: an AI agent with `gh` could remove it too.
- `ponytail:` upgrade path: in the gate, on `unlabeled` by a bot actor, re-add the label.

## Rollout

| Phase | Repo | Content | Status |
|---|---|---|---|
| 1 | crouton | `shared-merge-gate.yml`, caller, labels, labeler prefix, CLAUDE.md, ruleset JSON + README | 🔄 PR open |
| 2 | crouton | Apply ruleset (user, admin) after phase 1 is on `main`; test PR on `claude/test-gate` | ⏳ |
| 3 | annotation-editor | caller `merge-gate.yml`, `labels.yml`, `labeler.yml` prefix, `rulesets/main.json` + README, CLAUDE.md branch rule; apply ruleset | 🔄 PR open |
| 4 | vue_component_annotated_text | same as phase 3; note its `main.json` has its own bypass actor (`RepositoryRole` 5) and check names (`test`) — only append the new check | 🔄 PR open |

Phases 3–4 depend on phase 1 being merged (they call `shared-merge-gate.yml@main`).

## Verification

1. PR from `claude/test-gate` → `needs review` added, `merge-gate / gate` red, merge button blocked.
2. Remove label → check re-runs green, merge allowed (given other checks + approval).
3. Push another commit to the same branch → label back, check red.
4. PR from `docs/x` → no label, gate green. Add `block` → red. Remove → green.
5. Fork PR → gate runs (pull_request_target), no PR code executed.
6. `actionlint .github/workflows/*.yml` if available. Lint is not needed (no TS).
