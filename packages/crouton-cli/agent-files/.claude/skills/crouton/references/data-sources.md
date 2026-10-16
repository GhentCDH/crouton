# Data sources — decision table

## Prisma-backed (default)

Use when: data lives in the relational DB and a Prisma model exists.

`datasource.json`:
```json
{
  "name": "default",
  "prismaSchema": "prisma/schema.prisma",
  "prismaConfig": "prisma/prisma.config.ts",
  "urlEnv": "DATABASE_URL",
  "zodOutput": "generated/default/types/src",
  "clientOutput": "generated/default/client",
  "default": true
}
```

- `crouton update` introspects this datasource and manages column lists.
- Resources reference it implicitly when `kind` is `"default"`.

## Custom adapter

Use when: data comes from an external API, file, or non-Prisma store.

`datasource.json`:
```json
{
  "name": "external-api",
  "adapter": "custom"
}
```

- `crouton update` skips Prisma introspection for this datasource.
- Resources using it must supply a `repository.ts` that implements the crouton repository interface.
- Set `kind: "custom"` in `resource.json` and point `datasource` to this name.

## kind vs adapter

| Scenario | resource.json `kind` | datasource.json `adapter` |
|----------|----------------------|---------------------------|
| Prisma-backed resource | `"default"` (or omit) | omit (Prisma) |
| Config-only resource with custom repo | `"custom"` | omit (Prisma still used for other resources) |
| Fully external data source | `"custom"` | `"custom"` |

**Common mistake**: using `kind: "custom"` when you only need a custom adapter. If your data is in the DB but you want custom read logic, keep `kind: "default"` and override the repository at the NestJS module level.
