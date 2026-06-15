import { beforeAll, describe, expect, it } from 'vitest';

import type { CroutonConfig, LoadedConfig } from './config';
import { listResourceNames, makeRelationResolver, readExistingResource } from './project';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';



const config: CroutonConfig = {
  resourcesDir: 'resources',
  generatedTypesImport: '@np/generated/types',
  datasources: { docsdb: { prismaSchema: 'prisma/schema.prisma', default: true } },
};

let loaded: LoadedConfig;

beforeAll(async () => {
  const root = await mkdtemp(join(tmpdir(), 'crouton-proj-'));
  loaded = { config, path: join(root, 'crouton.config.json'), root };
  const res = join(root, 'resources');
  // language: has resource.json + schema.ts
  await mkdir(join(res, 'language'), { recursive: true });
  await writeFile(join(res, 'language', 'resource.json'), JSON.stringify({ name: 'language', columns: { id: { idField: true } } }));
  await writeFile(join(res, 'language', 'schema.ts'), 'export default {};');
  // author: resource.json only
  await mkdir(join(res, 'author'), { recursive: true });
  await writeFile(join(res, 'author', 'resource.json'), JSON.stringify({ name: 'author' }));
  // notAResource: directory without resource.json
  await mkdir(join(res, 'helpers'), { recursive: true });
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
    expect(names).toEqual(['author', 'language']);
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
