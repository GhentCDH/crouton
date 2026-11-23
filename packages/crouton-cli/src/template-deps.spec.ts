import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @nx/enforce-module-boundaries -- build/test-time only: reads repo package.jsons
import { readDepVersions } from '../../../tools/template-dep-versions.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Guards create-crouton templates against drifting from crouton's own dependency versions.
const repoRoot = resolve(import.meta.dirname, '../../..');
const templatesDir = join(repoRoot, 'packages/create-crouton/templates');
const versions = readDepVersions(repoRoot);

const templates = readdirSync(templatesDir, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.tmpl'))
  .map((f) => ({ file: f, text: readFileSync(join(templatesDir, f), 'utf8') }));

const major = (range: string) => range.match(/\d+/)?.[0];

describe('create-crouton template dependency versions', () => {
  it('every {{dep:x}} token resolves to a crouton version', () => {
    const unknown = templates.flatMap(({ file, text }) =>
      [...text.matchAll(/\{\{dep:([^}]+)\}\}/g)].map((m) => m[1]).filter((d) => !(d in versions)).map((d) => `${file}: ${d}`),
    );
    expect(unknown).toEqual([]);
  });

  it('deps crouton itself uses are tokens, not hardcoded ranges', () => {
    const hardcoded = templates
      .filter(({ file }) => file.endsWith('package.json.tmpl'))
      .flatMap(({ file, text }) =>
        [...text.matchAll(/"([^"]+)": "[~^]?\d[^"]*"/g)].map((m) => m[1]).filter((d) => d in versions).map((d) => `${file}: ${d}`),
      );
    expect(hardcoded).toEqual([]);
  });

  it.each([
    ['packages/crouton-api/package.json', '@nestjs/common'],
    ['packages/crouton-vue/package.json', 'vue-router'],
  ])('%s peer %s matches the scaffolded major', (pkgFile, dep) => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, pkgFile), 'utf8')) as { peerDependencies: Record<string, string> };
    const peer = pkg.peerDependencies[dep];
    expect(major(versions[dep])).toBe(major(peer));
  });
});
