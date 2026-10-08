# @ghentcdh/crouton-mcp

MCP server for crouton. Lets LLM agents (Claude Code, Cursor, opencode) query resources, validate configs, and search docs without running CLI commands.

## Setup

Add to `.claude/settings.json` (or your MCP config):

```json
{
  "mcpServers": {
    "crouton": {
      "command": "npx",
      "args": ["@ghentcdh/crouton-mcp"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `list_resources` | List all resources in this project |
| `get_resource` | Get a specific resource's config |
| `get_schema` | Get the JSON schema for resource/datasource/crouton.json |
| `validate` | Validate resource configs |
| `introspect_model` | Get Prisma model fields |
| `docs_search` | Search crouton docs |
