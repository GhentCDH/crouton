import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  type CroutonConfig,
  type ResolvedDatasource,
  loadConfig,
  loadDatasources,
  makeSchemaExportName,
  resolveDatasource,
  scaffoldConfigFromProject,
  validateConfig,
} from './config';

const ds = (over: Partial<ResolvedDatasource> & { name: string }): ResolvedDatasource => ({
  default: false,
  prismaSchema: `prisma/${over.name}/schema.prisma`,
  generatedTypesImport: `@np/generated/${over.name}`,
  prismaConfig: `prisma/${over.name}/prisma.config.ts`,
  ...over,
});

describe('resolveDatasource', () => {
  it('returns the single datasource', () => {
    expect(resolveDatasource([ds({ name: 'docsdb' })]).name).toBe('docsdb');
  });
  it('honors the explicit name', () => {
    const list = [ds({ name: 'a' }), ds({ name: 'b', default: true })];
    expect(resolveDatasource(list, 'a').name).toBe('a');
  });
  it('falls back to the default among many', () => {
    const list = [ds({ name: 'a' }), ds({ name: 'b', default: true })];
    expect(resolveDatasource(list).name).toBe('b');
  });
  it('throws when ambiguous (multiple, no default)', () => {
    expect(() => resolveDatasource([ds({ name: 'a' }), ds({ name: 'b' })])).toThrow(/specify which one/);
  });
  it('throws on unknown explicit name', () => {
    expect(() => resolveDatasource([ds({ name: 'a' })], 'zzz')).toThrow(/Unknown datasource/);
  });
});

describe('makeSchemaExportName', () => {
  const base: CroutonConfig = { resourcesDir: 'r', dataSourcesDir: 'd' };
  it('applies the template (default = WithRelations)', () => {
    expect(makeSchemaExportName(base)('Language')).toBe('LanguageWithRelationsSchema');
    expect(makeSchemaExportName({ ...base, schemaExportName: '{Model}Model' })('Text')).toBe('TextModel');
  });
});

describe('validateConfig', () => {
  it('requires resourcesDir + dataSourcesDir', () => {
    expect(() => validateConfig({ resourcesDir: '', dataSourcesDir: 'd' })).toThrow(/resourcesDir/);
    expect(() => validateConfig({ resourcesDir: 'r', dataSourcesDir: '' })).toThrow(/dataSourcesDir/);
    expect(() => validateConfig({ resourcesDir: 'r', dataSourcesDir: 'd' })).not.toThrow();
  });
});

describe('loadConfig + loadDatasources', () => {
  const writeProject = async () => {
    const root = await mkdtemp(join(tmpdir(), 'crouton-cfg-'));
    await writeFile(
      join(root, 'crouton.json'),
      JSON.stringify({ resourcesDir: 'src/app/resources', dataSourcesDir: 'src/app/data-sources' }),
    );
    const dsDir = join(root, 'src', 'app', 'data-sources');
    await mkdir(join(dsDir, 'docsdb'), { recursive: true });
    await writeFile(
      join(dsDir, 'docsdb', 'data-source.json'),
      JSON.stringify({
        type: 'postgres',
        name: 'docsdb',
        default: true,
        prismaSchema: 'prisma/docsdb/schema.prisma',
        urlEnv: 'DATABASE_APP_URL_LOCAL',
        generatedTypesImport: '@np/generated/docsdb',
        zodOutput: 'generated/docsdb/src',
      }),
    );
    return root;
  };

  it('loads crouton.json by walking up from a subdir', async () => {
    const root = await writeProject();
    await mkdir(join(root, 'a', 'b'), { recursive: true });
    const loaded = await loadConfig(join(root, 'a', 'b'));
    expect(loaded.root).toBe(root);
    expect(loaded.config.dataSourcesDir).toBe('src/app/data-sources');
    // datasources are NOT in crouton.json
    expect((loaded.config as any).datasources).toBeUndefined();
  });

  it('discovers datasources from the data-sources dir', async () => {
    const root = await writeProject();
    const loaded = await loadConfig(root);
    const datasources = await loadDatasources(loaded);
    expect(datasources).toHaveLength(1);
    expect(datasources[0]).toMatchObject({
      name: 'docsdb',
      default: true,
      prismaSchema: 'prisma/docsdb/schema.prisma',
      urlEnv: 'DATABASE_APP_URL_LOCAL',
      generatedTypesImport: '@np/generated/docsdb',
      zodOutput: 'generated/docsdb/src',
      prismaConfig: 'prisma/docsdb/prisma.config.ts', // defaulted
    });
  });
});

describe('scaffoldConfigFromProject', () => {
  it('proposes crouton.json (no datasources) + a self-describing data-source per folder', async () => {
    const root = await mkdtemp(join(tmpdir(), 'crouton-scaffold-'));
    await writeFile(join(root, 'prisma.config.ts'), 'export default { datasource: { url: env("DATABASE_APP_URL") } };');
    const dsDir = join(root, 'apps', 'backend', 'src', 'app', 'data-sources', 'docsdb');
    await mkdir(dsDir, { recursive: true });
    await writeFile(join(dsDir, 'data-source.json'), JSON.stringify({ name: 'docsdb', default: true }));
    const resDir = join(root, 'apps', 'backend', 'src', 'app', 'resources', 'language');
    await mkdir(resDir, { recursive: true });
    await writeFile(join(resDir, 'schema.ts'), "import { LanguageWithRelationsSchema } from '@np/generated/docsdb';\nexport default LanguageWithRelationsSchema;\n");

    const { config, datasources } = await scaffoldConfigFromProject(root);
    expect((config as any).datasources).toBeUndefined();
    expect((config as any).generatedTypesImport).toBeUndefined();
    expect(config.resourcesDir).toContain('resources');
    const docs = datasources.find((d) => d.name === 'docsdb')!;
    expect(docs).toMatchObject({
      default: true,
      urlEnv: 'DATABASE_APP_URL',
      generatedTypesImport: '@np/generated/docsdb',
      prismaSchema: 'prisma/docsdb/schema.prisma',
      zodOutput: 'generated/docsdb/src',
      prismaConfig: 'prisma/docsdb/prisma.config.ts',
    });
  });
});
