import { describe, expect, it } from 'vitest';

import { ResourceJsonSchema, ResourceJsonShape } from './ResourceJson.schema';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Docs drift guard (#546): every ```json / ```jsonc block in the guide and the
 * agent files the CLI writes into projects must use the current resource.json
 * shape. Blocks that cannot validate standalone (e.g. extension examples) opt
 * out with `<!-- docs-check: skip -->` on the line before the fence.
 */

const ROOT = resolve(__dirname, '../../../../..');
const SOURCES = ['docs/guide', 'packages/crouton-cli/agent-files'];

const ROOT_KEYS = new Set(Object.keys(ResourceJsonShape.shape));
/** Root keys that still parse (lifted for back-compat) but must not be documented. */
const REMOVED_ROOT_KEYS = ['display', 'modalSize', 'include', 'tableActions', 'actions'];
/** Removed root keys that are never valid at the top of any snippet either. */
const REMOVED_ANYWHERE_TOP = ['display', 'modalSize'];
const REMOVED_FIELD_INPUT_KEYS = ['relationType', 'resource', 'foreignKey'];

const listFiles = (dir: string): string[] =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.mdc?$/.test(f) && !f.includes('_generated'))
    .map((f) => join(dir, f));

type Block = { file: string; line: number; json: unknown };

const tryParse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const blocks: Block[] = [];
const files = SOURCES.flatMap(listFiles);

for (const file of files) {
  const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*```jsonc?\s*$/.test(lines[i])) continue;
    const skip = lines[i - 1]?.includes('docs-check: skip');
    const start = i;
    const body: string[] = [];
    while (++i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i]);
    if (skip) continue;
    // Strip `//` comments (not `://` in URLs) and trailing commas for jsonc.
    const text = body
      .map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'))
      .join('\n')
      .replace(/,(\s*[}\]])/g, '$1');
    // Fragments like `"authorId": { ... }` parse once wrapped in braces.
    const json = tryParse(text) ?? tryParse(`{${text}}`);
    // ponytail: snippets with `...` placeholders stay unparsed and unchecked.
    if (json !== undefined) blocks.push({ file, line: start + 1, json });
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/** A whole resource.json: a `columns` map plus `name` or `schemaVersion`. */
const isResource = (v: unknown): v is Record<string, unknown> =>
  isObject(v) && isObject(v['columns']) && ('name' in v || 'schemaVersion' in v);

/** Walk every object in a parsed block. */
const walk = (v: unknown, visit: (o: Record<string, unknown>) => void): void => {
  if (Array.isArray(v)) v.forEach((x) => walk(x, visit));
  else if (isObject(v)) {
    visit(v);
    Object.values(v).forEach((x) => walk(x, visit));
  }
};

const removedKeyProblems = (json: unknown): string[] => {
  const problems: string[] = [];
  walk(json, (o) => {
    const fi = o['fieldInput'];
    if (isObject(fi)) {
      for (const k of REMOVED_FIELD_INPUT_KEYS)
        if (k in fi) problems.push(`fieldInput.${k} (use column.relation)`);
      if (fi['format'] === 'relation')
        problems.push('fieldInput.format: "relation" (use column.relation)');
    }
  });
  const topKeys = isResource(json) ? REMOVED_ROOT_KEYS : REMOVED_ANYWHERE_TOP;
  if (isObject(json))
    for (const k of topKeys)
      if (k in json) problems.push(`root "${k}" (moved to layout / operations)`);
  return problems;
};

describe('docs examples (drift guard, #546)', () => {
  it('finds docs and json blocks to check', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(blocks.filter((b) => isResource(b.json)).length).toBeGreaterThan(5);
  });

  it('no json block uses removed resource.json keys', () => {
    const problems = blocks.flatMap((b) =>
      removedKeyProblems(b.json).map((p) => `${b.file}:${b.line} ${p}`),
    );
    expect(problems).toEqual([]);
  });

  it('every full resource.json example validates against the schema', () => {
    const problems = blocks
      .filter((b) => isResource(b.json))
      .flatMap((b) => {
        const json = b.json as Record<string, unknown>;
        const unknownKeys = Object.keys(json)
          .filter((k) => !ROOT_KEYS.has(k))
          .map((k) => `${b.file}:${b.line} unknown root key "${k}"`);
        const result = ResourceJsonSchema.safeParse(json);
        const issues = result.success
          ? []
          : result.error.issues.map(
              (i) => `${b.file}:${b.line} ${i.path.join('.')}: ${i.message}`,
            );
        return [...unknownKeys, ...issues];
      });
    expect(problems).toEqual([]);
  });

  it('agent files name the data source file data-source.json', () => {
    const offenders = files
      .filter((f) => f.startsWith('packages/crouton-cli'))
      .filter((f) => readFileSync(join(ROOT, f), 'utf8').includes('datasource.json'));
    expect(offenders).toEqual([]);
  });
});
