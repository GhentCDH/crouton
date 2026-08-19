import { beforeAll, describe, expect, it } from 'vitest';

import type { CroutonConfig, LoadedConfig } from './config';
import {
  isCustomResourceFile,
  listResourceNames,
  makeRelationResolver,
  readExistingResource,
} from './project';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const config: CroutonConfig = {
  resourcesDir: 'resources',
  dataSourcesDir: 'data-sources',
};

let loaded: LoadedConfig;

beforeAll(async () => {
  const root = await mkdtemp(join(tmpdir(), 'crouton-proj-'));
  loaded = { config, path: join(root, 'crouton.json'), root };
  const res = join(root, 'resources');
  // language: has resource.json + schema.ts
  await mkdir(join(res, 'language'), { recursive: true });
  await writeFile(
    join(res, 'language', 'resource.json'),
    JSON.stringify({ name: 'language', columns: { id: { idField: true } } }),
  );
  await writeFile(join(res, 'language', 'schema.ts'), 'export default {};');
  // author: resource.json only
  await mkdir(join(res, 'author'), { recursive: true });
  await writeFile(
    join(res, 'author', 'resource.json'),
    JSON.stringify({ name: 'author' }),
  );
  // notAResource: directory without resource.json
  await mkdir(join(res, 'helpers'), { recursive: true });
  // zotero_item: a config-only resource — no Prisma model to introspect
  await mkdir(join(res, 'zotero_item'), { recursive: true });
  await writeFile(
    join(res, 'zotero_item', 'resource.json'),
    JSON.stringify({ name: 'zotero_item', kind: 'custom' }),
  );
  await writeFile(join(res, 'zotero_item', 'repository.ts'), 'export default {};');
  // broken: unreadable JSON — the normal pipeline should still see it
  await mkdir(join(res, 'broken'), { recursive: true });
  await writeFile(join(res, 'broken', 'resource.json'), '{ not json');
});

describe('readExistingResource', () => {
  it('reads an existing config and detects schema.ts', async () => {
    const r = await readExistingResource(loaded, 'language');
    expect(r.config?.name).toBe('language');
    expect(r.hasSchemaFile).toBe(true);
  });
  it('reports null + no schema for a missing resource', async () => {
    const r = await readExistingResource(loaded, 'ghost');
    expect(r.config).toBeNull();
    expect(r.hasSchemaFile).toBe(false);
  });
  it('detects missing schema.ts on an existing resource', async () => {
    const r = await readExistingResource(loaded, 'author');
    expect(r.config?.name).toBe('author');
    expect(r.hasSchemaFile).toBe(false);
  });
});

describe('listResourceNames', () => {
  it('lists only directories with a resource.json', async () => {
    const names = (await listResourceNames(loaded)).sort();
    // 'broken' is included on purpose: a malformed file should surface through
    // the normal pipeline rather than being silently skipped here.
    expect(names).toEqual(['author', 'broken', 'language']);
  });

  it('excludes custom resources — they have no model to introspect', async () => {
    expect(await listResourceNames(loaded)).not.toContain('zotero_item');
  });
});

describe('isCustomResourceFile', () => {
  it('detects kind: custom', async () => {
    expect(
      await isCustomResourceFile(
        join(loaded.root, 'resources', 'zotero_item', 'resource.json'),
      ),
    ).toBe(true);
  });

  it('is false for a prisma resource', async () => {
    expect(
      await isCustomResourceFile(
        join(loaded.root, 'resources', 'language', 'resource.json'),
      ),
    ).toBe(false);
  });

  it('is false for an unreadable file, so the pipeline reports it', async () => {
    expect(
      await isCustomResourceFile(
        join(loaded.root, 'resources', 'broken', 'resource.json'),
      ),
    ).toBe(false);
    expect(await isCustomResourceFile(join(loaded.root, 'nope.json'))).toBe(
      false,
    );
  });
});

describe('makeRelationResolver', () => {
  it('wires relations to existing sibling resources only', async () => {
    const resolve = await makeRelationResolver(loaded);
    expect(resolve('Author')).toBe('../author/resource.json'); // exists (accessor "author")
    expect(resolve('Language')).toBe('../language/resource.json');
    expect(resolve('Unknown')).toBeUndefined();
  });
});
