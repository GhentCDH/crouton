import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as codegen from '@ghentcdh/crouton-codegen';

import { generatedPkgNames, runUpdateResources } from './runner';

// Self-contained mock: loading the real codegen (prisma internals) makes this suite flaky.
vi.mock('@ghentcdh/crouton-codegen', () => ({
  resolveFromRoot: (root: string, p: string) => `${root}/${p}`,
  resolveDatasource: (list: { name: string }[]) => list[0],
  scaffoldConfigFromProject: vi.fn(),
  loadConfig: vi.fn(),
  loadDotenv: vi.fn(),
  loadDatasources: vi.fn(),
  isGitDirty: vi.fn(),
  pullAndGenerate: vi.fn(),
  prismaGenerate: vi.fn(),
  introspect: vi.fn(),
  excludeModels: (models: unknown[]) => ({ included: models, excluded: [] }),
}));

const ds = {
  name: 'default',
  adapter: 'prisma',
  prismaSchema: 'prisma/schema.prisma',
  prismaConfig: 'prisma.config.ts',
  zodOutput: 'generated/types/src/index.ts',
  clientOutput: 'generated/client',
};

describe('runUpdateResources --dry-run (#622)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(codegen.loadConfig).mockResolvedValue({
      config: { title: 'T', resourcesDir: 'resources', dataSourcesDir: 'ds' },
      path: '/nowhere/crouton.json',
      root: '/nowhere',
    } as unknown as codegen.LoadedConfig);
    vi.mocked(codegen.loadDatasources).mockResolvedValue([ds] as never);
    vi.mocked(codegen.introspect).mockResolvedValue([]);
  });

  it('does not pull, generate or scaffold', async () => {
    await runUpdateResources({ cwd: '/nowhere', dryRun: true, yes: true });

    expect(codegen.pullAndGenerate).not.toHaveBeenCalled();
    expect(codegen.prismaGenerate).not.toHaveBeenCalled();
    // Still plans against the current schema.
    expect(codegen.introspect).toHaveBeenCalledWith({ schemaPath: '/nowhere/prisma/schema.prisma' });
  });

  it('does not scaffold a missing crouton.json', async () => {
    vi.mocked(codegen.loadConfig).mockRejectedValue(new Error('not found'));
    await runUpdateResources({ cwd: '/nowhere', dryRun: true, yes: true });

    expect(codegen.scaffoldConfigFromProject).not.toHaveBeenCalled();
    expect(codegen.introspect).not.toHaveBeenCalled();
  });
});

describe('generatedPkgNames (#673)', () => {
  it('uses the package from data-source.json, not the workspace scope or title', async () => {
    const names = await generatedPkgNames('/nowhere', { ...ds, generatedTypesImport: '@gateway/generated-default-types' } as never, 'Annophis');
    expect(names).toEqual({ types: '@gateway/generated-default-types', client: '@gateway/generated-default-client' });
  });

  it('falls back to the crouton title for path-style imports', async () => {
    const names = await generatedPkgNames('/nowhere', { ...ds, generatedTypesImport: '@app/generated/default/types' } as never, 'My App');
    expect(names).toEqual({ types: '@my-app/generated-default-types', client: '@my-app/generated-default-client' });
  });
});
