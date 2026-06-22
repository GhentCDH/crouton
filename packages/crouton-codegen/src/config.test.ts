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
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base: CroutonConfig = {
  resourcesDir: 'apps/backend/src/app/resources',
  dataSourcesDir: 'apps/backend/src/app/data-sources',
  enumsFile: 'crouton.enums.json',
};

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
    expect(resolveDatasource([ds({ name: 'a' }), ds({ name: 'b', default: true })], 'a').name).toBe('a');
  });
  it('falls back to the default among many', () => {
    expect(resolveDatasource([ds({ name: 'a' }), ds({ name: 'b', default: true })]).name).toBe('b');
  });
  it('throws when ambiguous (multiple, no default)', () => {
    expect(() => resolveDatasource([ds({ name: 'a' }), ds({ name: 'b' })])).toThrow(/specify which one/);
  });
  it('throws on an unknown explicit name', () => {
    expect(() => resolveDatasource([ds({ name: 'a' })], 'zzz')).toThrow(/Unknown datasource/);
  });
});

describe('makeSchemaExportName', () => {
  it('applies the template (default = WithRelations)', () => {
    expect(makeSchemaExportName(base)('Language')).toBe('LanguageWithRelationsSchema');
    expect(makeSchemaExportName({ ...base, schemaExportName: '{Model}Model' })('Text')).toBe('TextModel');
  });
});

describe('validateConfig', () => {
  it('requires resourcesDir and dataSourcesDir', () => {
    expect(() => validateConfig({ ...base, resourcesDir: '' })).toThrow(/resourcesDir/);
    expect(() => validateConfig({ ...base, dataSourcesDir: '' })).toThrow(/dataSourcesDir/);
    expect(() => validateConfig(base)).not.toThrow();
  });
});

describe('loadConfig + loadDatasources', () => {
  it('loads crouton.json by walking up, and discovers datasources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'crouton-cfg-'));
    await writeFile(join(root, 'crouton.json'), JSON.stringify(base));
    const dsDir = join(root, 'apps', 'backend', 'src', 'app', 'data-sources', 'docsdb');
    await mkdir(dsDir, { recursive: true });
    await writeFile(
      join(dsDir, 'data-source.json'),
      JSON.stringify({
        type: 'postgres',
        name: 'docsdb',
        default: true,
        prismaSchema: 'prisma/schema.prisma',
        urlEnv: 'DATABASE_APP_URL',
        generatedTypesImport: '@np/generated/types',
        zodOutput: 'generated/types/src',
        prismaConfig: 'prisma.config.ts',
      }),
    );
    await mkdir(join(root, 'a', 'b'), { recursive: true });

    const loaded = await loadConfig(join(root, 'a', 'b'));
    expect(loaded.root).toBe(root);

    const datasources = await loadDatasources(loaded);
    expect(datasources).toHaveLength(1);
    expect(resolveDatasource(datasources)).toMatchObject({
      name: 'docsdb',
      prismaSchema: 'prisma/schema.prisma',
      generatedTypesImport: '@np/generated/types',
      prismaConfig: 'prisma.config.ts',
    });
  });

  it('defaults prismaConfig + name from the folder when omitted', async () => {
    const root = await mkdtemp(join(tmpdir(), 'crouton-cfg2-'));
    await writeFile(join(root, 'crouton.json'), JSON.stringify({ resourcesDir: 'r', dataSourcesDir: 'ds' }));
    await mkdir(join(root, 'ds', 'analyticsdb'), { recursive: true });
    await writeFile(
      join(root, 'ds', 'analyticsdb', 'data-source.json'),
      JSON.stringify({ prismaSchema: 'prisma/analyticsdb/schema.prisma', generatedTypesImport: '@np/generated/analyticsdb' }),
    );
    const loaded = await loadConfig(root);
    const [only] = await loadDatasources(loaded);
    expect(only.name).toBe('analyticsdb');
    expect(only.prismaConfig).toBe('prisma/analyticsdb/prisma.config.ts');
  });
});

describe('scaffoldConfigFromProject', () => {
  it('proposes a paths-only crouton.json + a data-source.json per datasource', async () => {
    const root = await mkdtemp(join(tmpdir(), 'crouton-scaffold-'));
    await mkdir(join(root, 'prisma'), { recursive: true });
    await writeFile(join(root, 'prisma.config.ts'), 'export default { datasource: { url: env("DATABASE_APP_URL") } };');
    const dsDir = join(root, 'apps', 'backend', 'src', 'app', 'data-sources', 'docsdb');
    await mkdir(dsDir, { recursive: true });
    await writeFile(join(dsDir, 'data-source.json'), JSON.stringify({ name: 'docsdb', default: true }));
    const resDir = join(root, 'apps', 'backend', 'src', 'app', 'resources', 'language');
    await mkdir(resDir, { recursive: true });
    await writeFile(
      join(resDir, 'schema.ts'),
      'import { LanguageSchema } from \'@np/generated/types\';\nexport default LanguageSchema;\n',
    );

    const { config, datasources } = await scaffoldConfigFromProject(root);
    expect(config).not.toHaveProperty('datasources');
    expect(config.resourcesDir).toContain('resources');
    expect(config.dataSourcesDir).toContain('data-sources');
    const docs = datasources.find((d) => d.name === 'docsdb')!;
    expect(docs).toMatchObject({
      folder: 'docsdb',
      default: true,
      urlEnv: 'DATABASE_APP_URL',
      generatedTypesImport: '@np/generated/types',
    });
  });
});
