#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  type ValidationIssue,
  findConfigPath,
  introspect,
  loadConfig,
  loadDatasources,
  resolveFromRoot,
  validateResourceFile,
} from '@ghentcdh/crouton-codegen';

import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const server = new McpServer({
  name: 'crouton',
  version: '0.0.1',
});

const discoverResourceFiles = async (cwd: string): Promise<{ name: string; path: string }[]> => {
  const configPath = await findConfigPath(cwd);
  if (!configPath) return [];
  const loaded = await loadConfig(cwd);
  const base = resolveFromRoot(loaded.root, loaded.config.resourcesDir);
  let entries: { isDirectory(): boolean; name: string }[];
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    return [];
  }
  const result: { name: string; path: string }[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    result.push({ name: e.name, path: join(base, e.name, 'resource.json') });
  }
  return result;
};

const findPrismaSchema = async (cwd: string): Promise<string | undefined> => {
  const configPath = await findConfigPath(cwd);
  if (!configPath) return undefined;
  const loaded = await loadConfig(cwd);
  // Try datasources first for the schema path
  try {
    const datasources = await loadDatasources(loaded);
    if (datasources.length > 0 && datasources[0]?.prismaSchema) {
      const schemaPath = resolve(loaded.root, datasources[0].prismaSchema);
      if (existsSync(schemaPath)) return schemaPath;
    }
  } catch {
    // fall through to common path scan
  }
  // ponytail: walk common locations; use datasource.prismaSchema if config format expands
  for (const candidate of [
    join(loaded.root, 'prisma', 'schema.prisma'),
    join(loaded.root, 'schema.prisma'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
};

server.tool('list_resources', 'List all crouton resources in the project', {}, async () => {
  const cwd = process.cwd();
  const files = await discoverResourceFiles(cwd);
  if (files.length === 0) {
    return { content: [{ type: 'text', text: 'No resources found. Ensure crouton.json exists.' }] };
  }
  const resources = await Promise.all(
    files.map(async ({ name, path }) => {
      try {
        const raw = JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>;
        return { name, path, title: (raw['title'] as string | undefined) ?? name, kind: (raw['kind'] as string | undefined) ?? 'prisma' };
      } catch {
        return { name, path, title: name, kind: 'unknown' };
      }
    }),
  );
  return { content: [{ type: 'text', text: JSON.stringify(resources, null, 2) }] };
});

server.tool(
  'get_resource',
  'Get a specific resource config by name',
  { name: z.string().describe('Resource name (directory name under resourcesDir)') },
  async ({ name }) => {
    const cwd = process.cwd();
    const files = await discoverResourceFiles(cwd);
    const found = files.find((f) => f.name === name);
    if (!found) {
      return { content: [{ type: 'text', text: `Resource "${name}" not found. Available: ${files.map((f) => f.name).join(', ')}` }] };
    }
    const issues = await validateResourceFile(found.path);
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(found.path, 'utf-8'));
    } catch (e) {
      return { content: [{ type: 'text', text: `Could not read ${found.path}: ${(e as Error).message}` }] };
    }
    const result = {
      resource: raw,
      validation: { valid: issues.length === 0, issueCount: issues.length },
    };
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'get_schema',
  'Get the JSON schema for resource, datasource, or crouton.json',
  { kind: z.enum(['resource', 'datasource', 'crouton']).optional().default('resource').describe('Which schema to fetch') },
  async ({ kind }) => {
    const schemaUrls: Record<string, string> = {
      resource: 'https://raw.githubusercontent.com/GhentCDH/crouton/main/packages/crouton-core/src/lib/resource/resource.schema.json',
      datasource: 'https://raw.githubusercontent.com/GhentCDH/crouton/main/packages/crouton-core/src/lib/data-source/data-source.schema.json',
      crouton: 'https://raw.githubusercontent.com/GhentCDH/crouton/main/packages/crouton-core/src/lib/crouton.schema.json',
    };
    const localPaths: Record<string, string> = {
      resource: 'src/lib/resource/resource.schema.json',
      datasource: 'src/lib/data-source/data-source.schema.json',
      crouton: 'src/lib/crouton.schema.json',
    };

    const resolvedKind = kind ?? 'resource';
    // Try loading from installed package first
    const candidates = [
      join(process.cwd(), 'node_modules', '@ghentcdh', 'crouton-core', localPaths[resolvedKind] ?? ''),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        try {
          const schema = JSON.parse(await readFile(candidate, 'utf-8')) as Record<string, unknown>;
          const requiredFields = Array.isArray(schema['required']) ? (schema['required'] as string[]) : [];
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ url: schemaUrls[resolvedKind], requiredFields, schema }, null, 2),
            }],
          };
        } catch {
          // fall through
        }
      }
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ url: schemaUrls[resolvedKind], note: 'Schema file not found locally; use the URL above.' }),
      }],
    };
  },
);

server.tool(
  'validate',
  'Validate resource.json files',
  {
    paths: z.array(z.string()).optional().describe('Paths to validate; defaults to all discovered resources'),
    strict: z.boolean().optional().default(false).describe('Enable strict checks'),
  },
  async ({ paths, strict }) => {
    const cwd = process.cwd();
    let files: string[];
    if (paths && paths.length > 0) {
      files = paths.map((p) => resolve(p));
    } else {
      const discovered = await discoverResourceFiles(cwd);
      files = discovered.map((d) => d.path);
    }
    if (files.length === 0) {
      return { content: [{ type: 'text', text: JSON.stringify({ ok: false, issues: [{ message: 'No resource files found' }] }) }] };
    }
    const allIssues: ValidationIssue[] = [];
    for (const file of files) {
      const issues = await validateResourceFile(file, { strict: strict ?? false });
      allIssues.push(...issues);
    }
    const formatted = allIssues.map((i) => {
      const parts = [i.file, i.path ? `(${i.path})` : '', ':', i.message];
      if (i.hint) parts.push('.', i.hint);
      return parts.filter(Boolean).join(' ');
    });
    const result = { ok: allIssues.length === 0, issueCount: allIssues.length, issues: formatted };
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'introspect_model',
  'Get Prisma model fields by model name',
  { model: z.string().describe('Prisma model name (e.g. "User", "BookCollection")') },
  async ({ model }) => {
    const cwd = process.cwd();
    const schemaPath = await findPrismaSchema(cwd);
    if (!schemaPath) {
      return { content: [{ type: 'text', text: 'No Prisma schema found. Expected prisma/schema.prisma or schema.prisma at the project root.' }] };
    }
    try {
      const models = await introspect({ schemaPath });
      const found = models.find(
        (m) => m.prismaName === model || m.clientAccessor === model,
      );
      if (!found) {
        const available = models.map((m) => m.prismaName).join(', ');
        return { content: [{ type: 'text', text: `Model "${model}" not found. Available: ${available}` }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(found, null, 2) }] };
    } catch (e) {
      // ponytail: regex prisma parser; use prisma DMMF if this breaks on edge cases
      const schema = await readFile(schemaPath, 'utf-8');
      const modelMatch = new RegExp(`model\\s+${model}\\s*\\{([^}]*)\\}`, 's').exec(schema);
      if (!modelMatch) {
        return { content: [{ type: 'text', text: `Model "${model}" not found in schema (DMMF load failed: ${(e as Error).message})` }] };
      }
      const fields = (modelMatch[1] ?? '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('//') && !l.startsWith('@@'))
        .map((l) => l.split(/\s+/).slice(0, 2).join(' '));
      return { content: [{ type: 'text', text: JSON.stringify({ model, fields, note: 'Parsed via regex (DMMF unavailable)' }, null, 2) }] };
    }
  },
);

server.tool(
  'docs_search',
  'Search crouton agent docs for a query',
  { query: z.string().describe('Search query (case-insensitive substring match)') },
  async ({ query }) => {
    // ponytail: substring search; use embeddings if recall matters
    const docsDir = join(
      process.cwd(),
      'node_modules',
      '@ghentcdh',
      'crouton-core',
      'agent-docs',
    );
    if (!existsSync(docsDir)) {
      return { content: [{ type: 'text', text: 'No agent-docs found in @ghentcdh/crouton-core.' }] };
    }
    const q = query.toLowerCase();
    const entries = await readdir(docsDir, { withFileTypes: true });
    const results: { title: string; path: string; snippet: string }[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const filePath = join(docsDir, entry.name);
      const nameMatch = entry.name.toLowerCase().includes(q);
      let content: string;
      try {
        content = await readFile(filePath, 'utf-8');
      } catch {
        continue;
      }
      const contentMatch = content.toLowerCase().includes(q);
      if (nameMatch || contentMatch) {
        const firstParagraph = content.split('\n').slice(0, 10).join(' ').slice(0, 300);
        const title = entry.name.replace(/\.md$/, '').replace(/-/g, ' ');
        results.push({ title, path: filePath, snippet: firstParagraph });
      }
      if (results.length >= 5) break;
    }
    if (results.length === 0) {
      return { content: [{ type: 'text', text: `No docs found matching "${query}".` }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
