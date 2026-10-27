/**
 * Phase 0 baseline: records the drift between `compileResource` (crouton-core)
 * and `fromJson` (crouton-api) when both run WITHOUT filesystem resolvers
 * (no dirPath, no hooks, no actions).
 *
 * First run writes core-vs-api.drift.json. Subsequent runs fail if drift changes
 * unexpectedly. Allowed drift entries are the behaviour picks for phases 4–6.
 */
import { describe, expect, it } from 'vitest';

import { buildResourceJsonSchema, compileResource } from '@ghentcdh/crouton-core';
import type { ResourceJson } from '@ghentcdh/crouton-core';

import { fromJson } from './index';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FIXTURES_ROOT = resolve(
  __dirname,
  '../../../../../crouton-core/test-fixtures/resources',
);

const DRIFT_SNAPSHOT = resolve(
  __dirname,
  '../../../../../crouton-core/src/lib/compile/__snapshots__/core-vs-api.drift.json',
);

// Fields that only exist in api Resource by design (Node-only / code-bearing).
const API_ONLY_FIELDS = new Set(['hooks', 'repository', 'actions', 'tableActions']);

const loadJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return undefined;
  }
};

const deepEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

type FieldDiff = {
  coreValue: unknown;
  apiValue: unknown;
};

const diffObjects = (
  core: Record<string, unknown>,
  api: Record<string, unknown>,
): Record<string, FieldDiff> => {
  const diff: Record<string, FieldDiff> = {};
  const allKeys = new Set([...Object.keys(core), ...Object.keys(api)]).values();
  for (const key of allKeys) {
    if (API_ONLY_FIELDS.has(key)) continue;
    // columns: compare length only (order-sensitive details captured in snapshots)
    if (key === 'columns') {
      const cLen = Array.isArray(core[key]) ? (core[key] as unknown[]).length : 0;
      const aLen = Array.isArray(api[key]) ? (api[key] as unknown[]).length : 0;
      if (cLen !== aLen) diff[key] = { coreValue: `[${cLen} cols]`, apiValue: `[${aLen} cols]` };
      continue;
    }
    if (!deepEqual(core[key], api[key])) {
      diff[key] = { coreValue: core[key], apiValue: api[key] };
    }
  }
  return diff;
};

const cases = readdirSync(FIXTURES_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

describe('core-vs-api drift', () => {
  const drift: Record<string, Record<string, FieldDiff> | 'error'> = {};

  for (const caseName of cases) {
    const caseDir = join(FIXTURES_ROOT, caseName);
    const resources = readdirSync(caseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((r) => existsSync(join(caseDir, r, 'resource.json')));

    for (const resourceName of resources) {
      const key = `${caseName}/${resourceName}`;
      it(key, () => {
        const raw = loadJson(join(caseDir, resourceName, 'resource.json'));
        const parsed = buildResourceJsonSchema().safeParse(raw);
        if (!parsed.success) {
          drift[key] = 'error';
          return;
        }
        const json = parsed.data as ResourceJson;

        let coreResult: Record<string, unknown>;
        let apiResult: Record<string, unknown>;
        try {
          coreResult = compileResource(json) as unknown as Record<string, unknown>;
        } catch {
          drift[key] = 'error';
          return;
        }
        try {
          apiResult = fromJson(json, undefined, undefined) as unknown as Record<string, unknown>;
        } catch {
          drift[key] = 'error';
          return;
        }

        const fieldDiff = diffObjects(coreResult, apiResult);
        drift[key] = Object.keys(fieldDiff).length ? fieldDiff : {};
      });
    }
  }

  it('drift file snapshot', async () => {
    // Sort keys for stable output
    const sorted = Object.fromEntries(
      Object.entries(drift).sort(([a], [b]) => a.localeCompare(b)),
    );
    await expect(JSON.stringify(sorted, null, 2)).toMatchFileSnapshot(DRIFT_SNAPSHOT);
  });
});
