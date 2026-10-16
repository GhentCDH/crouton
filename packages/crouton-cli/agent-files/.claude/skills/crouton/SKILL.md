---
name: crouton
description: Add or change crouton resources, relations, field inputs, layouts, operations and data sources (resource.json, datasource.json, crouton.json). Use for any change to these files.
crouton-version: 0.0.1-alpha.82
---

> If `crouton --version` differs from `crouton-version` above, run `crouton migrate` first.

# Crouton skill

Crouton is a resource-driven admin UI framework. This skill teaches the correct workflow for adding and changing resources.

## What crouton is
- Resources live in `<resourcesDir>` (see `crouton.json`). Each is a folder with `resource.json`.
- Data sources live in `<dataSourcesDir>`. Each is a folder with `datasource.json`.
- The Prisma schema (`schema.prisma`) is the source of truth for models and columns. Never hand-edit column lists that `crouton update` owns.

## The workflow loop

1. Change `schema.prisma` (add/modify models or fields).
2. Run `crouton update` — regenerates column lists, migrations, and type stubs.
3. Edit `resource.json` (UI/behaviour: labels, field inputs, relations, layout).
4. Run `crouton validate` — fix any reported issues before proceeding.
5. Typecheck/build to confirm no TS errors.

## Key rules
- Never hand-edit auto-generated sections inside `resource.json` (marked with comments).
- Use `manyToOne` for autocomplete lookups; `oneToMany` for embedded tables.
- `kind: "custom"` only when you have a `repository.ts` (config-only resource). For non-Prisma data, use `adapter` in `datasource.json`.
- After any `resource.json` or `crouton.json` change, run `crouton validate`.
- Layout nodes use `items` only — there is no `controls` list. Items render in declared order.
- Table settings (`rowActions`, `tableActions`, `searchFields`, `filterFields`) go on the `type: "table"` node inside `layout.table`, never on an outer wrapper node.
- When `layout.<ctx>` is defined, it is the **full list** for that context — only listed columns render. Unlisted columns are hidden regardless of `hiddenIn*` flags.
- After editing layouts, run `crouton migrate --check` to confirm no migration is needed.

## Project-specific notes
If `.claude/skills/crouton/project.md` exists, read it first — it holds project conventions that override these defaults.

## References
- `references/resource-json.md` — annotated full example + key table
- `references/relations.md` — relation recipes
- `references/field-inputs.md` — which input for which column type
- `references/data-sources.md` — prisma vs custom adapter
- `references/recipes.md` — task recipes
- `references/common-mistakes.md` — common mistakes

## Docs for the installed version
`node_modules/@ghentcdh/crouton-core/agent-docs/README.md`
