import { describe, expect, it } from 'vitest';

import {
  type CroutonConfig,
  loadConfig,
  makeSchemaExportName,
  resolveDatasource,
  scaffoldConfigFromProject,
  validateConfig,
} from './config';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';



const base: CroutonConfig = {
  resourcesDir: 'src/app/resources',
  generatedTypesImport: '@np/generated/types',
  datasources: { docsdb: { prismaSchema: 'prisma/schema.prisma', urlEnv: 'DATABASE_APP_URL', default: true } },
};

describe('resolveDatasource', () => {
  it('returns the single datasource', () => {
    expect(resolveDatasource(base)).toMatchObject({ name: 'docsdb', urlEnv: 'DATABASE_APP_URL' });
  });
  it('honors the explicit name', () => {
    const cfg = { ...base, datasources: { a: { prismaSchema: 'a.prisma' }, b: { prismaSchema: 'b.prisma', default: true } } };
    expect(resolveDatasource(cfg, 'a').name).toBe('a');
  });
  it('falls back to the default among many', () => {
    const cfg = { ...base, datasources: { a: { prismaSchema: 'a.prisma' }, b: { prismaSchema: 'b.prisma', default: true } } };
    expect(resolveDatasource(cfg).name).toBe('b');
  });
  it('throws when ambiguous (multiple, no default)', () => {
    const cfg = { ...base, datasources: { a: { prismaSchema: 'a.prisma' }, b: { prismaSchema: 'b.prisma' } } };
    expect(() => resolveDatasource(cfg)).toThrow(/specify which one/);
  });
});

describe('makeSchemaExportName', () => {
  it('applies the template', () => {
    expect(makeSchemaExportName(base)('Language')).toBe('LanguageWithRelationsSchema');
    expect(makeSchemaExportName({ ...base, schemaExportName: '{Model}Model' })('Text')).toBe('TextModel');
  });
});

describe('validateConfig', () => {
  it('rejects missing required fields and double defaults', () => {
    expect(() => validateConfig({ ...base, resourcesDir: '' })).toThrow(/resourcesDir/);
    expect(() => validateConfig({ ...base, datasources: {} })).toThrow(/at least one datasource/);
    expect(() =>
      validateConfig({ ...base, datasources: { a: { prismaSchema: 'a', default: true }, b: { prismaSchema: 'b', default: true } } }),
    ).toThrow(/only one datasource/);
  });
});

describe('loadConfig + scaffoldConfigFromProject', () => {
  it('loads a crouton.config.json by walking up from a subdir', async () => {
    const root = await mkdtemp(join(tmpdir(), 'crouton-cfg-'));
    await writeFile(join(root, 'crouton.config.json'), JSON.stringify(base));
    await mkdir(join(root, 'a', 'b'), { recursive: true });
    const loaded = await loadConfig(join(root, 'a', 'b'));
    expect(loaded.root).toBe(root);
    expect(loaded.config.generatedTypesImport).toBe('@np/generated/types');
  });

  it('scaffolds by detecting prisma url env, datasources, and the types import', async () => {
    const root = await mkdtemp(join(tmpdir(), 'crouton-scaffold-'));
    await mkdir(join(root, 'prisma'), { recursive: true });
    await writeFile(join(root, 'prisma', 'schema.prisma'), 'datasource db { provider = "postgresql" }');
    await writeFile(join(root, 'prisma.config.ts'), 'export default { datasource: { url: env("DATABASE_APP_URL") } };');
    const dsDir = join(root, 'apps', 'backend', 'src', 'app', 'data-sources', 'docsdb');
    await mkdir(dsDir, { recursive: true });
    await writeFile(join(dsDir, 'data-source.json'), JSON.stringify({ name: 'docsdb', default: true }));
    const resDir = join(root, 'apps', 'backend', 'src', 'app', 'resources', 'language');
    await mkdir(resDir, { recursive: true });
    await writeFile(join(resDir, 'schema.ts'), 'import { LanguageSchema } from \'@np/generated/types\';\nexport default LanguageSchema;\n');

    const { config, notes } = await scaffoldConfigFromProject(root);
    expect(config.datasources.docsdb).toMatchObject({ urlEnv: 'DATABASE_APP_URL', default: true });
    expect(config.generatedTypesImport).toBe('@np/generated/types');
    expect(config.resourcesDir).toContain('resources');
    expect(notes).toEqual([]); // everything detected
  });
});
