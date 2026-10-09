# Crouton agent eval

Measures whether LLM agents can complete crouton tasks correctly on the first try.

## Running

```bash
# Run a single task against Claude Code
claude -p tools/agent-eval/tasks/01-add-resource.md

# Then verify
node tools/agent-eval/verify.mjs tasks/01-add-resource
```

## Adding tasks

Each task is a `.md` file in `tasks/`. Each task has a paired `verify-*.mjs` script in `verify/`.

## Interpreting results

Exit 0 = agent succeeded. Exit 1 = agent failed — the output names what was wrong.
Log failures and turn each into a schema description fix, a validator hint, or a common-mistake entry.
