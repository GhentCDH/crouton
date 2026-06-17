import { describe, expect, it } from 'vitest';

import { buildDatasourceFiles } from './datasource-scaffold';

describe('buildDatasourceFiles', () => {
  const out = buildDatasourceFiles({
    name: 'analyticsdb',
    dataSourcesDir: 'apps/backend/src/app/data-sources',
    urlEnv: 'ANALYTICS_DATABASE_URL',
    generatedTypesImport: '@my-app/generated/analyticsdb',
  });
  const file = (suffix: string) => out.files.find((f) => f.path.endsWith(suffix))!;

  it('emits the four datasource files at the right paths', () => {
    expect(out.files.map((f) => f.path).sort()).toEqual([
      'apps/backend/src/app/data-sources/analyticsdb/data-source.json',
      'apps/backend/src/app/data-sources/analyticsdb/index.ts',
      'prisma/analyticsdb/prisma.config.ts',
      'prisma/analyticsdb/schema.prisma',
    ]);
  });

  it('writes a self-describing data-source.json', () => {
    const ds = JSON.parse(file('data-source.json').contents);
    expect(ds).toMatchObject({
      type: 'postgres',
      name: 'analyticsdb',
      prismaSchema: 'prisma/analyticsdb/schema.prisma',
      urlEnv: 'ANALYTICS_DATABASE_URL',
      generatedTypesImport: '@my-app/generated/analyticsdb',
      zodOutput: 'generated/analyticsdb/src',
      prismaConfig: 'prisma/analyticsdb/prisma.config.ts',
    });
    expect('default' in ds).toBe(false);
  });

  it('omits default unless requested, and includes it when set', () => {
    const def = buildDatasourceFiles({
      name: 'maindb',
      dataSourcesDir: 'data-sources',
      urlEnv: 'DATABASE_URL',
      generatedTypesImport: '@app/generated/maindb',
      default: true,
    });
    const ds = JSON.parse(def.files.find((f) => f.path.endsWith('data-source.json'))!.contents);
    expect(ds.default).toBe(true);
  });

  it('gives each datasource a unique, posix-relative client + zod output', () => {
    const schema = file('schema.prisma').contents;
    expect(schema).toContain('output   = "../../generated/analyticsdb/client"');
    expect(schema).toContain('output                           = "../../generated/analyticsdb/src"');
    expect(schema).toContain('provider = "postgresql"');
    // no url in the datasource block (Prisma 7)
    expect(schema).not.toMatch(/^\s*url\s*=/m);
  });

  it('imports the generated client by relative path in index.ts', () => {
    const idx = file('index.ts').contents;
    expect(idx).toContain(
      "import { PrismaClient } from '../../../../../../generated/analyticsdb/client';",
    );
    expect(idx).toContain('process.env.ANALYTICS_DATABASE_URL');
  });

  it('binds the urlEnv in prisma.config.ts', () => {
    const cfg = file('prisma.config.ts').contents;
    expect(cfg).toContain("schema: 'prisma/analyticsdb/schema.prisma'");
    expect(cfg).toContain("path: 'prisma/analyticsdb/migrations'");
    expect(cfg).toContain("url: env('ANALYTICS_DATABASE_URL')");
  });

  it('maps known db types to prisma providers', () => {
    const mysql = buildDatasourceFiles({
      name: 'legacy',
      dataSourcesDir: 'data-sources',
      urlEnv: 'LEGACY_URL',
      generatedTypesImport: '@app/generated/legacy',
      type: 'mysql',
    });
    expect(mysql.files.find((f) => f.path.endsWith('schema.prisma'))!.contents).toContain(
      'provider = "mysql"',
    );
  });
});
