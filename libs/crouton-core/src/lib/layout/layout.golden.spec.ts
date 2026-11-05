import { describe, expect, it } from 'vitest';

import { compileResource } from '../compile/compile-resource';
import type { ResourceJson } from '../resource';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const FIXTURES_DIR = resolve(__dirname, '__fixtures__');

const fixtures = readdirSync(FIXTURES_DIR)
  .filter((f) => f.endsWith('.resource.json'))
  .map((f) => ({
    name: basename(f, '.resource.json'),
    json: JSON.parse(readFileSync(join(FIXTURES_DIR, f), 'utf-8')) as ResourceJson,
  }));

describe('layout golden snapshots', () => {
  for (const { name, json } of fixtures) {
    it(name, async () => {
      const compiled = compileResource(json);
      const snapshot = {
        views: compiled.views ?? null,
        lookup: compiled.lookup ?? null,
      };
      const snapshotPath = resolve(
        __dirname,
        `__snapshots__/layout.golden/${name}.json`,
      );
      await expect(JSON.stringify(snapshot, null, 2)).toMatchFileSnapshot(snapshotPath);
    });
  }
});
